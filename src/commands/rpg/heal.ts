import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    removeBalance,
    syncStats,
    updateUserStats,
} from "../../services";

export const heal = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("heal")
        .setDescription("[RPG] Visit a Statue of the Seven.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        const userProfile = await getProfileByUserId(i.user.id);
        if (!userProfile) {
            return r.edit(
                embedComment(
                    "No profile found for your user. Please set up your profile.",
                ),
            );
        }

        let stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        if (stats.isHunting || stats.abyssMode) {
            return r.edit(embedComment("You cannot heal right now!"));
        }

        stats = await syncStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `Failed to sync your stats. Please try again later.`,
                ),
            );
        }

        const baseHealCost = Math.floor(Math.random() * (50 - 40 + 1)) + 40;
        const worldLevelCost = stats.worldLevel * 1;
        const initialHealCost = baseHealCost + worldLevelCost;

        const rebirthMultiplier = 1 + 0.2 * stats.rebirths;

        const healCost = Math.round(initialHealCost * rebirthMultiplier);

        if (userProfile.balance < healCost) {
            return r.edit(
                embedComment(
                    `You don't have enough ${customEmoji.a.z_coins} Coins to heal.\n- You need at least \`${healCost}\` ${texts.c.u}.`,
                ),
            );
        }
        if (stats.hp >= stats.maxHP) {
            return r.edit(
                embedComment(`You can't heal anymore, you're at the max HP.`),
            );
        }

        const maxHP = stats.maxHP;
        const baseHealPercentage = Math.random() * (0.75 - 0.25) + 0.25;
        let healAmount = Math.floor(baseHealPercentage * maxHP);

        healAmount += healAmount * stats.healEffectiveness;

        healAmount = Math.max(1, Math.floor(healAmount));

        const newHp = Math.min(stats.hp + healAmount, maxHP);

        await Promise.all([
            updateUserStats(i.user.id, { hp: newHp }),
            removeBalance(
                i.user.id,
                healCost,
                true,
                `Paid ${healCost} ${texts.c.u} to heal ${healAmount} HP`,
            ),
        ]);

        return r.edit(
            embedComment(
                `The Statue of The Seven took ${customEmoji.a.z_coins} \`${healCost} ${texts.c.u}\` and healed you for \`${healAmount} HP\`!\nYour current HP is \`${newHp}/${maxHP}\``,
                "Green",
            ),
        );
    },
});
