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

        if (userProfile.balance < 50) {
            return r.edit(
                embedComment(
                    `You don't have enough ${customEmoji.a.z_coins} coins to heal. You need 50 coins.`,
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

        const maxHP = stats.maxHP;
        const newHp = Math.min(stats.hp + 25, maxHP);

        await Promise.all([
            updateUserStats(i.user.id, { hp: newHp }),
            removeBalance(i.user.id, 50, true, "Paid 50 coins to heal 25 HP"),
        ]);

        return r.edit(
            embedComment(
                `You paid ${customEmoji.a.z_coins} \`50 ${texts.c.u}\` and healed \`25 HP\`! Your current HP is \`${newHp}/${maxHP}\`.`,
                "Green",
            ),
        );
    },
});
