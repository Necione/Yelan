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
import type { ChatInputCommandInteraction } from "discord.js";
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
) {
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
                `<a:z_reward:1091219256395452517> You stumbled upon some chests!`,
            )
            .setDescription(
                `Select one of the chests below to claim its contents.\n\n${chestDescriptions.join(
                    "\n\n",
                )}`,
            )
            .setColor("Green");

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
            return i.editReply(
                embedComment(`Unable to fetch the original message`),
            );
        }

        const c = await awaitComponent(message, {
            only: { originalUser: true },
            time: get.secs(10),
            custom_ids: [{ id: "chest_", includes: true }],
        });
        if (!c) {
            return i
                .editReply({
                    embeds: [
                        embed.setDescription(
                            `You got distracted and lost the opportunity to claim a chest.`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        await c.deferUpdate().catch(noop);

        const selectedChestIndex = parseInt(c.customId.split("_")[1]) - 1;
        const selectedChest = chestLoots[selectedChestIndex];

        if (is.array(selectedChest.loot)) {
            await addItemToInventory(i.user.id, selectedChest.loot);
        }

        const lootDescription =
            selectedChest.loot.length > 0
                ? selectedChest.loot
                      .map((item) => `\`${item.amount}x\` ${item.item}`)
                      .join(", ")
                : "No items";

        await i
            .editReply({
                embeds: [
                    embed.setDescription(
                        `You chose **Chest ${
                            selectedChestIndex + 1
                        }** *(Rarity: ${
                            selectedChest.rarity
                        })*\n\nIt contained the following items:\n${lootDescription}`,
                    ),
                ],
                components: [],
            })
            .catch(noop);
    } catch (err) {
        debug(`[HANDLE:CHEST]: ${i.user.tag} (${i.user.id})`, err);
    }
}

export async function handleMaterials(i: ChatInputCommandInteraction) {
    try {
        const { materials } = generateRawMaterials();

        if (is.array(materials)) {
            await addItemToInventory(
                i.user.id,
                materials.map((material) => ({
                    item: material.item,
                    amount: material.amount,
                })),
            );

            const materialsList = materials
                .map((material) => `\`${material.amount}x\` ${material.item}`)
                .join(", ");

            await i
                .editReply(
                    embedComment(
                        `You gathered raw materials while exploring!\nYou found ${materialsList}.`,
                        "Green",
                    ),
                )
                .catch(noop);
        } else {
            return i.editReply(
                embedComment(`Unable to find any raw materials.`),
            );
        }
    } catch (err) {
        debug(`[HANDLE:TRAP]: ${i.user.tag} (${i.user.id})`, err);
    }
}
