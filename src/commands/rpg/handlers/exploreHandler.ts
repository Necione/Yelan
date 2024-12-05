import {
    addButtonRow,
    awaitComponent,
    embedComment,
    get,
    is,
    log,
    make,
} from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import type { UserStats } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import {
    addBalance,
    addItemToInventory,
    removeBalance,
    updateUserStats,
} from "../../../services";
import { getAmount } from "../../../utils";
import { generateChestLoot, generateRawMaterials } from "../../../utils/chest";
import type { ArtifactName } from "../../../utils/rpgitems/artifacts";
import type { DropName } from "../../../utils/rpgitems/drops";
import type { WeaponName } from "../../../utils/rpgitems/weapons";
const noop = (...args: unknown[]) => log(`[EXPLORE_HANDLER]: ERROR`, ...args);

export async function handleChest(
    i: ChatInputCommandInteraction,
    stats: UserStats,
) {
    try {
        const chance = Math.random();

        if (chance < 0.05) {
            return await handleTrap(i, stats);
        }

        let chestLoots = make.array<{
            rarity: string;
            coins: number;
            loot: {
                item: DropName | WeaponName | ArtifactName;
                amount: number;
            }[];
        }>();
        for (let j = 0; j < 3; j++) {
            chestLoots.push(generateChestLoot(stats.worldLevel));
        }

        const rarity = chestLoots[0].rarity;
        chestLoots = chestLoots.map((c) => {
            c.rarity = rarity;
            return c;
        });

        const chestDescriptions = chestLoots.map((chest, index) => {
            const lootDescription =
                chest.loot.length > 0
                    ? chest.loot
                          .map((item) => `\`${item.amount}x\` ${item.item}`)
                          .join(", ")
                    : "No items";
            return `**Chest ${index + 1}:**\n${getAmount(chest.coins)}${
                lootDescription ? `\nItems: ${lootDescription}` : ""
            }`;
        });

        const embed = new EmbedBuilder()
            .setTitle(
                `<a:z_reward:1091219256395452517> You stumbled upon some ${rarity} Treasure Chests!`,
            )
            .setDescription(
                `Select one of the chests below to claim its contents. You have **10 seconds** to choose!\n\n${chestDescriptions.join(
                    "\n\n",
                )}`,
            )
            .setColor("Green");

        const message = await i
            .editReply({
                embeds: [embed],
                components: [
                    addButtonRow([
                        {
                            id: "chest_1",
                            label: "Chest 1",
                            style: ButtonStyle.Primary,
                        },
                        {
                            id: "chest_2",
                            label: "Chest 2",
                            style: ButtonStyle.Primary,
                        },
                        {
                            id: "chest_3",
                            label: "Chest 3",
                            style: ButtonStyle.Primary,
                        },
                    ]),
                ],
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

        await addBalance(
            i.user.id,
            selectedChest.coins,
            false,
            `Found a ${rarity} Treasure Chest`,
        );

        if (is.array(selectedChest.loot)) {
            await addItemToInventory(i.user.id, selectedChest.loot);
        }

        const lootDescription =
            selectedChest.loot.length > 0
                ? selectedChest.loot
                      .map((item) => `\`${item.amount}x\` ${item.item}`)
                      .join(", ")
                : "";

        await i
            .editReply({
                embeds: [
                    embed.setDescription(
                        lootDescription
                            ? `You chose **Chest ${
                                  selectedChestIndex + 1
                              }**!\n\nIt contained ${getAmount(
                                  selectedChest.coins,
                              )} and the following items:\n${lootDescription}`
                            : `You chose **Chest ${
                                  selectedChestIndex + 1
                              }**!\n\nIt contained ${getAmount(
                                  selectedChest.coins,
                              )}.`,
                    ),
                ],
                components: [],
            })
            .catch(noop);
    } catch (err) {
        log(`[HANDLE:CHEST]: ${i.user.tag} (${i.user.id})`, err);
    }
}

export async function handleMaterials(
    i: ChatInputCommandInteraction,
    stats: UserStats,
) {
    try {
        const chance = Math.random();

        if (chance < 0.05) {
            return await handleTrap(i, stats);
        }

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
        log(`[HANDLE:TRAP]: ${i.user.tag} (${i.user.id})`, err);
    }
}

async function handleTrap(i: ChatInputCommandInteraction, stats: UserStats) {
    try {
        const trapDamage = 20;
        const coinLoss = 50;

        const newHP = Math.max(stats.hp - trapDamage, 0);
        await updateUserStats(i.user.id, { hp: { set: newHP } });

        await removeBalance(
            i.user.id,
            coinLoss,
            true,
            `Lost ${coinLoss} ${texts.c.u} after falling into a trap`,
        );

        await i
            .editReply(
                embedComment(
                    `You fell into a trap while exploring!\nYou lost ${getAmount(
                        coinLoss,
                    )} and took \`${trapDamage} HP\` damage.`,
                    "Red",
                ),
            )
            .catch(noop);
    } catch (err) {
        log(`[HANDLE:TRAP]: ${i.user.tag} (${i.user.id})`, err);
    }
}
