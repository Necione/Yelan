import { embedComment, noop } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import type { UserStats } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import {
    addBalance,
    addItemToInventory,
    updateUserStats,
} from "../../../services";
import { generateChestLoot } from "../../../utils/chest";

export async function handleAbyssChest(
    i: ChatInputCommandInteraction,
    stats: UserStats,
    currentFloor: number,
    currentX: number,
    currentY: number,
) {
    const fullKey = `${currentFloor},${currentX},${currentY}`;
    const legacyKey = currentFloor === 1 ? `${currentX},${currentY}` : null;

    let chestAlreadyCollected = false;

    if (currentFloor === 1) {
        if (stats.collectedChests.includes(fullKey)) {
            chestAlreadyCollected = true;
        } else if (legacyKey && stats.collectedChests.includes(legacyKey)) {
            chestAlreadyCollected = true;

            const updatedChests = stats.collectedChests.filter(
                (key) => key !== legacyKey,
            );
            updatedChests.push(fullKey);
            await updateUserStats(i.user.id, {
                collectedChests: updatedChests,
            });
            stats.collectedChests = updatedChests;
        }
    } else {
        if (stats.collectedChests.includes(fullKey)) {
            chestAlreadyCollected = true;
        }
    }

    if (chestAlreadyCollected) {
        await i.editReply(
            embedComment(
                currentFloor === 1
                    ? `You have already collected the chest at floor **${currentFloor}**, position \`${currentX}, ${currentY}\`.`
                    : `You have already collected the chest at floor **${currentFloor}**, position \`${currentX}, ${currentY}\`.`,
                "Yellow",
            ),
        );
        return;
    }

    const chestLoot = await generateChestLoot(stats.worldLevel);

    if (Math.random() < 0.01) {
        chestLoot.loot.push({ item: "Engulfing Lightning", amount: 1 });
    }

    if (Math.random() < 0.5) {
        chestLoot.loot.push({ item: "Chaos Oculus", amount: 1 });
        chestLoot.loot.push({ item: "Geode", amount: 1 });
    }

    await addBalance(
        i.user.id,
        chestLoot.coins,
        false,
        `Collected a Treasure Chest at Floor ${currentFloor} (${currentX}, ${currentY})`,
    );

    if (chestLoot.loot.length > 0) {
        await addItemToInventory(i.user.id, chestLoot.loot);
    }

    stats.collectedChests.push(fullKey);
    await updateUserStats(i.user.id, {
        collectedChests: stats.collectedChests,
    });

    const lootDescription =
        chestLoot.loot.length > 0
            ? chestLoot.loot
                  .map((item) => `\`${item.amount}x\` ${item.item}`)
                  .join(", ")
            : "No items";

    const resultMessage =
        chestLoot.coins > 0
            ? `You have collected the chest at floor **${currentFloor}**, position \`${currentX}, ${currentY}\`!\nIt contained ${customEmoji.a.z_coins} \`${chestLoot.coins}\``
            : `You have collected the chest at floor **${currentFloor}**, position \`${currentX}, ${currentY}\`!`;

    const finalMessage =
        chestLoot.loot.length > 0
            ? `${resultMessage} and the following items:\n${lootDescription}`
            : `${resultMessage}.`;

    const embed = new EmbedBuilder()
        .setTitle("You Collected a Treasure Chest!")
        .setDescription(finalMessage)
        .setColor("Green");

    await i.editReply({ embeds: [embed] }).catch(noop);
}
