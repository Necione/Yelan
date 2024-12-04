import { addButtonRow, embedComment, get, noop } from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import type { UserStats } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import { ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import {
    addBalance,
    addItemToInventory,
    removeBalance,
    updateUserStats,
} from "../../../services";
import { getAmount } from "../../../utils";
import { generateChestLoot, generateRawMaterials } from "../../../utils/chest";

export async function handleChest(
    i: ChatInputCommandInteraction,
    stats: UserStats,
) {
    const chance = Math.random();

    if (chance < 0.05) {
        await handleTrap(i, stats);
        return;
    }

    const chestPromises = [];
    for (let j = 0; j < 3; j++) {
        chestPromises.push(generateChestLoot(stats.worldLevel));
    }

    const chestLoots = await Promise.all(chestPromises);

    const rarity = chestLoots[0].rarity;
    for (let j = 1; j < chestLoots.length; j++) {
        chestLoots[j].rarity = rarity;
    }

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
        return;
    }

    const collector = message.createMessageComponentCollector({
        filter: (ii) => ii.user.id === i.user.id,
        componentType: ComponentType.Button,
        time: get.secs(10),
        max: 1,
    });

    let collected = false;

    collector.on("collect", async (interaction) => {
        collected = true;
        await interaction.deferUpdate().catch(noop);

        const selectedChestIndex =
            parseInt(interaction.customId.split("_")[1]) - 1;
        const selectedChest = chestLoots[selectedChestIndex];

        await addBalance(
            i.user.id,
            selectedChest.coins,
            false,
            `Found a ${rarity} Treasure Chest`,
        );

        if (selectedChest.loot.length > 0) {
            await addItemToInventory(i.user.id, selectedChest.loot);
        }

        const lootDescription =
            selectedChest.loot.length > 0
                ? selectedChest.loot
                      .map((item) => `\`${item.amount}x\` ${item.item}`)
                      .join(", ")
                : "";

        const resultMessage = lootDescription
            ? `You chose **Chest ${
                  selectedChestIndex + 1
              }**!\n\nIt contained ${getAmount(
                  selectedChest.coins,
              )} and the following items:\n${lootDescription}`
            : `You chose **Chest ${
                  selectedChestIndex + 1
              }**!\n\nIt contained ${getAmount(selectedChest.coins)}.`;

        embed.setDescription(resultMessage);
        await i.editReply({ embeds: [embed], components: [] }).catch(noop);
    });

    collector.on("end", async () => {
        if (!collected) {
            embed.setDescription(
                `You got distracted and lost the opportunity to claim a chest.`,
            );
            await i.editReply({ embeds: [embed], components: [] }).catch(noop);
        }
    });
}

export async function handleMaterials(
    i: ChatInputCommandInteraction,
    stats: UserStats,
) {
    const chance = Math.random();

    if (chance < 0.05) {
        await handleTrap(i, stats);
        return;
    }

    const { materials } = generateRawMaterials();

    if (materials.length > 0) {
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
    }
}

async function handleTrap(i: ChatInputCommandInteraction, stats: UserStats) {
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
}
