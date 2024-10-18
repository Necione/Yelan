import { embedComment, noop } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import type { UserStats } from "@prisma/client";
import type {
    ButtonInteraction,
    ChatInputCommandInteraction,
} from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
} from "discord.js";
import {
    addBalance,
    addItemToInventory,
    removeBalance,
    updateUserStats,
} from "../../../services";
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
        return `**Chest ${index + 1}:**\n${customEmoji.a.z_coins} \`${
            chest.coins
        }\`${lootDescription ? `\nItems: ${lootDescription}` : ""}`;
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

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("chest_1")
            .setLabel("Chest 1")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("chest_2")
            .setLabel("Chest 2")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("chest_3")
            .setLabel("Chest 3")
            .setStyle(ButtonStyle.Primary),
    );

    const message = await i
        .editReply({
            embeds: [embed],
            components: [buttons],
        })
        .catch(noop);

    if (!message) {
        return;
    }

    const filter = (interaction: ButtonInteraction) =>
        interaction.user.id === i.user.id;

    const collector = message.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button,
        time: 10_000,
        max: 1,
    });

    let collected = false;

    collector.on("collect", async (interaction: ButtonInteraction) => {
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
            ? `<a:z_reward:1091219256395452517> You chose **Chest ${
                  selectedChestIndex + 1
              }**!\nIt contained ${customEmoji.a.z_coins} \`${
                  selectedChest.coins
              }\` and the following items:\n${lootDescription}`
            : `You chose **Chest ${selectedChestIndex + 1}**!\nIt contained ${
                  customEmoji.a.z_coins
              } \`${selectedChest.coins}\`.`;

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
                `You fell into a trap while exploring!\nYou lost ${customEmoji.a.z_coins} \`${coinLoss} ${texts.c.u}\` and took \`${trapDamage} HP\` damage.`,
                "Red",
            ),
        )
        .catch(noop);
}
