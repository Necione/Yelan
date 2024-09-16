import { embedComment, get, noop } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import type { UserStats, UserWallet } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import {
    addBalance,
    addItemToInventory,
    removeBalance,
    updateUserStats,
} from "../../../services";
import { cooldowns } from "../../../utils";
import { generateChestLoot } from "../../../utils/chest";

export async function handleChest(
    i: ChatInputCommandInteraction,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const fallsIntoTrap = Math.random() < 0.1;

    if (fallsIntoTrap) {
        const trapDamage = 20;
        const coinLoss = 50;

        const newHP = Math.max(stats.hp - trapDamage, 0);
        await updateUserStats(i.user.id, { hp: { set: newHP } });

        await removeBalance(
            i.user.id,
            coinLoss,
            true,
            `Lost ${coinLoss} coins after falling into a trap`,
        );

        await i
            .editReply(
                embedComment(
                    `You fell into a trap while exploring!\nYou lost ${customEmoji.a.z_coins} \`${coinLoss} Coins\` and took \`${trapDamage} HP\` damage.`,
                    "Red",
                ),
            )
            .catch(noop);

        const hasEnergizeSkill =
            stats.skills.some((skill) => skill.name === "Energize") &&
            stats.activeSkills.includes("Energize");

        const exploreCooldown = hasEnergizeSkill ? get.mins(20) : get.mins(30);
        await cooldowns.set(userWallet, "explore", exploreCooldown);

        return;
    }

    const { rarity, loot, coins } = generateChestLoot(stats.worldLevel);

    await addBalance(
        i.user.id,
        coins,
        false,
        `Found a ${rarity} Treasure Chest`,
    );

    if (loot.length > 0) {
        await addItemToInventory(i.user.id, loot);
    }

    const lootDescription =
        loot.length > 0
            ? loot.map((item) => `\`${item.amount}x\` ${item.item}`).join(", ")
            : "";

    const message = lootDescription
        ? `You stumbled upon a ${rarity} Treasure Chest!\nIt contained ${customEmoji.a.z_coins} \`${coins} Coins\` and the following items:\n${lootDescription}`
        : `You stumbled upon a ${rarity} Treasure Chest!\nIt contained ${customEmoji.a.z_coins} \`${coins} Coins\`.`;

    await i.editReply(embedComment(message, "Green")).catch(noop);

    const hasEnergizeSkill =
        stats.skills.some((skill) => skill.name === "Energize") &&
        stats.activeSkills.includes("Energize");

    const exploreCooldown = hasEnergizeSkill ? get.mins(20) : get.mins(30);

    await cooldowns.set(userWallet, "explore", exploreCooldown);
}
