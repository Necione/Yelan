import { embedComment, get, noop } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import type { UserStats, UserWallet } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import {
    addBalance,
    addItemToInventory,
    removeBalance,
    updateUserStats,
} from "../../../services";
import { cooldowns } from "../../../utils";
import { generateChestLoot, generateRawMaterials } from "../../../utils/chest";

export async function handleChest(
    i: ChatInputCommandInteraction,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const chance = Math.random();

    if (chance < 0.05) {
        await handleTrap(i, stats, userWallet);
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
        ? `You stumbled upon a ${rarity} Treasure Chest!\nIt contained ${customEmoji.a.z_coins} \`${coins}\` and the following items:\n${lootDescription}`
        : `You stumbled upon a ${rarity} Treasure Chest!\nIt contained ${customEmoji.a.z_coins} \`${coins}\`.`;

    await i.editReply(embedComment(message, "Green")).catch(noop);

    const hasEnergizeSkill =
        stats.skills.some((skill) => skill.name === "Energize") &&
        stats.activeSkills.includes("Energize");

    const exploreCooldown = hasEnergizeSkill ? get.mins(15) : get.mins(20);
    await cooldowns.set(userWallet, "explore", exploreCooldown);
}

export async function handleMaterials(
    i: ChatInputCommandInteraction,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const chance = Math.random();

    if (chance < 0.05) {
        await handleTrap(i, stats, userWallet);
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

    const hasEnergizeSkill =
        stats.skills.some((skill) => skill.name === "Energize") &&
        stats.activeSkills.includes("Energize");

    const exploreCooldown = hasEnergizeSkill ? get.mins(15) : get.mins(20);
    await cooldowns.set(userWallet, "explore", exploreCooldown);
}

async function handleTrap(
    i: ChatInputCommandInteraction,
    stats: UserStats,
    userWallet: UserWallet,
) {
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

    const hasEnergizeSkill =
        stats.skills.some((skill) => skill.name === "Energize") &&
        stats.activeSkills.includes("Energize");

    const exploreCooldown = hasEnergizeSkill ? get.mins(15) : get.mins(20);
    await cooldowns.set(userWallet, "explore", exploreCooldown);
}
