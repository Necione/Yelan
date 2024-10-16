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
    currentX: number,
    currentY: number,
) {
    const chestKey = `${currentX},${currentY}`;
    if (stats.collectedChests.includes(chestKey)) {
        await i.editReply(
            embedComment(
                "You have already collected the chest at this location.",
                "Yellow",
            ),
        );
        return;
    }

    const chestLoot = await generateChestLoot(stats.worldLevel);

    if (Math.random() < 0.01) {
        chestLoot.loot.push({ item: "Engulfing Lightning", amount: 1 });
    }

    const geodeAmount = Math.random() < 0.75 ? 1 : 2;
    chestLoot.loot.push({ item: "Geode", amount: geodeAmount });

    if (Math.random() < 0.5) {
        chestLoot.loot.push({ item: "Chaos Oculus", amount: 1 });
    }

    await addBalance(
        i.user.id,
        chestLoot.coins,
        false,
        `Collected a Treasure Chest at (${currentX}, ${currentY})`,
    );

    if (chestLoot.loot.length > 0) {
        await addItemToInventory(i.user.id, chestLoot.loot);
    }

    stats.collectedChests.push(chestKey);
    await updateUserStats(i.user.id, {
        collectedChests: stats.collectedChests,
    });

    const lootDescription =
        chestLoot.loot.length > 0
            ? chestLoot.loot
                  .map((item) => `\`${item.amount}x\` ${item.item}`)
                  .join(", ")
            : "No items";

    const resultMessage = lootDescription
        ? `You have collected the chest at \`${currentX}, ${currentY}\`!\nIt contained ${customEmoji.a.z_coins} \`${chestLoot.coins}\` and the following items:\n${lootDescription}`
        : `You have collected the chest at \`${currentX}, ${currentY}\`!\nIt contained ${customEmoji.a.z_coins} \`${chestLoot.coins}\`.`;

    const embed = new EmbedBuilder()
        .setTitle("You Collected a Treasure Chest!")
        .setDescription(resultMessage)
        .setColor("Green");

    await i.editReply({ embeds: [embed] }).catch(noop);
}
