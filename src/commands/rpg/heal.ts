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
    async execute(interaction, r) {
        const userId = interaction.user.id;
        const userProfile = await getProfileByUserId(userId);

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

        const stats = await getUserStats(userId);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please setup your profile.`,
                ),
            );
        }

        const newHp = Math.min(stats.hp + 25, 100);

        await Promise.all([
            updateUserStats(userId, { hp: newHp }),
            removeBalance(userId, 50, true, "Paid 50 coins to heal 25 HP"),
        ]);

        return r.edit(
            embedComment(
                `You paid ${customEmoji.a.z_coins} \`50 ${texts.c.u}\` and healed \`25 HP\`! Your current HP is \`${newHp}/100\`.`,
                "Green",
            ),
        );
    },
});
