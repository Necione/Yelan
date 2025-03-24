import {
    addButtonRow,
    awaitComponent,
    embedComment,
    get,
    getRandomValue,
    is,
    make,
    noop,
} from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import type { ChatInputCommandInteraction, Message } from "discord.js";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { addItemToInventory } from "../../../services";
import { debug } from "../../../utils";
import { generateChestLoot, generateRawMaterials } from "../../../utils/chest";
import type { ArtifactName } from "../../../utils/rpgitems/artifacts";
import type { DropName } from "../../../utils/rpgitems/drops";
import type { WeaponName } from "../../../utils/rpgitems/weapons";

export async function handleChest(
    i: ChatInputCommandInteraction,
    stats: UserStats,
): Promise<Message<boolean> | undefined> {
    try {
        const numberOfChests = getRandomValue(2, 4);

        const chestLoots = make.array<{
            rarity: string;
            loot: {
                item: DropName | WeaponName | ArtifactName;
                amount: number;
            }[];
        }>();

        for (let j = 0; j < numberOfChests; j++) {
            chestLoots.push(generateChestLoot(stats.adventureRank));
        }

        const chestDescriptions = chestLoots.map((chest, index) => {
            const lootDescription =
                chest.loot.length > 0
                    ? chest.loot
                          .map((item) => `\`${item.amount}x\` ${item.item}`)
                          .join(", ")
                    : "No items";
            return `**Chest ${index + 1}** *(Rarity: ${chest.rarity})*\n${
                lootDescription ? `Items: ${lootDescription}` : ""
            }`;
        });

        const embed = new EmbedBuilder()
            .setTitle(
                `<a:z_reward:1091219256395452517> You found some treasure chests!`,
            )
            .setDescription(
                `Select one of the chests below to claim its contents.\n\n${chestDescriptions.join(
                    "\n\n",
                )}`,
            )
            .setColor("Gold");

        const buttonRow = addButtonRow(
            chestLoots.map((_, idx) => ({
                id: `chest_${idx + 1}`,
                label: `Chest ${idx + 1}`,
                style: ButtonStyle.Primary,
            })),
        );

        const message = await i
            .editReply({
                embeds: [embed],
                components: [buttonRow],
            })
            .catch(noop);

        if (!message) {
            await i.editReply(
                embedComment(`Unable to fetch the original message`),
            );
            return;
        }

        const c = await awaitComponent(message, {
            only: { originalUser: true },
            time: get.secs(30),
            custom_ids: [{ id: "chest_", includes: true }],
        });

        if (!c) {
            const timeoutMessage = await i
                .editReply({
                    embeds: [
                        embed.setDescription(
                            `You got distracted and lost the opportunity to claim a chest.`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
            return timeoutMessage || undefined;
        }

        await c.deferUpdate().catch(noop);

        const selectedChestIndex = parseInt(c.customId.split("_")[1]) - 1;
        const selectedChest = chestLoots[selectedChestIndex];

        if (is.array(selectedChest.loot)) {
            const added = await addItemToInventory(
                i.user.id,
                selectedChest.loot,
            );

            const lootDescription =
                selectedChest.loot.length > 0
                    ? selectedChest.loot
                          .map((item) => `\`${item.amount}x\` ${item.item}`)
                          .join(", ")
                    : "No items";

            const finalMessage = await i
                .editReply({
                    embeds: [
                        embed.setDescription(
                            `You chose **Chest ${
                                selectedChestIndex + 1
                            }** *(Rarity: ${selectedChest.rarity})*\n\n${
                                added
                                    ? `It contained the following items:\n${lootDescription}`
                                    : "Your inventory is full! No items were added."
                            }`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);

            return finalMessage || undefined;
        }
        return message;
    } catch (err) {
        debug(`[HANDLE:CHEST]: ${i.user.tag} (${i.user.id})`, err);
        return;
    }
}

export async function handleMaterials(
    i: ChatInputCommandInteraction,
): Promise<Message<boolean> | undefined> {
    try {
        const { materials } = generateRawMaterials();

        if (is.array(materials)) {
            const added = await addItemToInventory(
                i.user.id,
                materials.map((material) => ({
                    item: material.item,
                    amount: material.amount,
                })),
            );

            const materialsList = materials
                .map((material) => `\`${material.amount}x\` ${material.item}`)
                .join(", ");

            const message = await i
                .editReply(
                    embedComment(
                        added
                            ? `You found some raw materials while gathering!\nYou found ${materialsList}.`
                            : `Your inventory is full! No materials were added.`,
                        "Green",
                    ),
                )
                .catch(noop);

            return message || undefined;
        } else {
            const message = await i.editReply(
                embedComment(`Unable to find any raw materials.`),
            );
            return message || undefined;
        }
    } catch (err) {
        debug(`[HANDLE:MATERIALS]: ${i.user.tag} (${i.user.id})`, err);
        return;
    }
}
