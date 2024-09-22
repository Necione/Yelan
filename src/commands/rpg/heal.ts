import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    removeBalance,
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

        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please setup your profile.`,
                ),
            );
        }

        if (stats.isHunting) {
            return r.edit(embedComment("You cannot heal while hunting!"));
        }

        const baseHealCost = Math.floor(Math.random() * (50 - 40 + 1)) + 40;
        const healCost = baseHealCost + stats.worldLevel * 5;

        const maxBaseHealCost = 50;
        const maxHealCost = maxBaseHealCost + stats.worldLevel * 5;

        if (userProfile.balance < healCost) {
            return r.edit(
                embedComment(
                    `You don't have enough ${customEmoji.a.z_coins} Coins to heal. You need at least \`${maxHealCost}\` coins.`,
                ),
            );
        }

        const maxHP = stats.maxHP;
        const healAmount = maxHP - stats.hp;

        if (healAmount <= 0) {
            return r.edit(embedComment("Your HP is already at maximum."));
        }

        const newHp = maxHP;

        await Promise.all([
            updateUserStats(i.user.id, { hp: newHp }),
            removeBalance(
                i.user.id,
                healCost,
                true,
                `Paid ${healCost} coins to heal ${healAmount} HP`,
            ),
        ]);

        return r.edit(
            embedComment(
                `The Statue of The Seven took ${customEmoji.a.z_coins} \`${healCost} ${texts.c.u}\` and healed you!\nYour current HP is \`${newHp}/${maxHP}\``,
                "Green",
            ),
        );
    },
});
