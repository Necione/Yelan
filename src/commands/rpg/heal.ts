import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    removeBalance,
    syncStats,
    updateUserStats,
} from "../../services";
import { getAmount } from "../../utils";

function calculateHealCost(stats: {
    rebirths: number;
    adventureRank: number;
}): number {
    const baseHealCost =
        stats.rebirths <= 1
            ? Math.floor(Math.random() * (30 - 25 + 1)) + 25
            : Math.floor(Math.random() * (50 - 40 + 1)) + 40;
    const adventureRankCost = stats.rebirths <= 1 ? 0 : stats.adventureRank;
    const initialHealCost = baseHealCost + adventureRankCost;
    const rebirthMultiplier =
        stats.rebirths <= 1 ? 1 : 1 + 0.2 * stats.rebirths;
    return Math.round(initialHealCost * rebirthMultiplier);
}

function calculateHealAmount(stats: {
    maxHP: number;
    hp: number;
    healEffectiveness: number;
}): number {
    const baseHealPercentage = Math.random() * (0.75 - 0.25) + 0.25;
    let healAmount = Math.floor(baseHealPercentage * stats.maxHP);
    healAmount += healAmount * stats.healEffectiveness;
    return Math.max(1, Math.floor(healAmount));
}

export const heal = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("heal")
        .setDescription("[RPG] Visit a Statue of the Seven.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        const userId = i.user.id;
        const userProfile = await getProfileByUserId(userId);
        if (!userProfile) {
            return r.edit(
                embedComment(
                    "No profile found for your user. Please set up your profile.",
                ),
            );
        }

        let stats = await getUserStats(userId);
        if (!stats) {
            return r.edit(
                embedComment(
                    "No stats found for you, please set up your profile.",
                ),
            );
        }

        if (stats.isHunting || stats.abyssMode) {
            return r.edit(embedComment("You cannot heal right now!"));
        }

        stats = await syncStats(userId);
        if (!stats) {
            return r.edit(
                embedComment(
                    "Failed to sync your stats. Please try again later.",
                ),
            );
        }

        const healCost = calculateHealCost(stats);
        if (userProfile.balance < healCost) {
            return r.edit(
                embedComment(
                    `You don't have enough ${
                        texts.c.u
                    } to heal.\n- You need at least ${getAmount(healCost)}.`,
                ),
            );
        }
        if (stats.hp >= stats.maxHP) {
            return r.edit(
                embedComment("You can't heal anymore, you're at the max HP."),
            );
        }

        const healAmount = calculateHealAmount(stats);
        const newHp = Math.min(stats.hp + healAmount, stats.maxHP);
        const percentHealed = ((healAmount / stats.maxHP) * 100).toFixed(2);

        await Promise.all([
            updateUserStats(userId, { hp: { set: newHp } }),
            removeBalance(
                userId,
                healCost,
                true,
                `Paid ${healCost} ${texts.c.u} to heal ${healAmount} HP`,
            ),
        ]);

        return r.edit(
            embedComment(
                `The Statue of The Seven took ${getAmount(
                    healCost,
                )} and healed you for \`${healAmount} HP\` (${percentHealed}% of your max HP)!\nYour current HP is \`${newHp}/${
                    stats.maxHP
                }\`.`,
                "Green",
            ),
        );
    },
});
