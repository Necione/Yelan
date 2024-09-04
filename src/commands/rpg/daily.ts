import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, updateUserStreak } from "../../services";
import { cooldowns, getAmount } from "../../utils";

export const daily = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Claim your daily check-in reward.")
        .setDMPermission(false),
    defer: { silent: false },
    execute: async (i, r) => {
        const p = await getProfileByUserId(i.user.id);
        const cc = cooldowns.get(
            p,
            "daily",
            `⌚ You've already claimed your daily reward, try again %DURATION%`,
        );
        if (!cc.status) {
            return r.edit(embedComment(cc.message));
        }
        const updatedUser = await updateUserStreak(i.user.id);
        if (!updatedUser) {
            return r.edit(
                embedComment("An error occurred while updating your streak."),
            );
        }

        await cooldowns.set(p, "daily", get.days(1)); // 1 day in milliseconds
        return r.edit({
            embeds: [
                {
                    title: `🗓️ ${i.user.username}'s Daily Check-in`,
                    description: `You just claimed ${getAmount(
                        updatedUser.dailyTotal,
                    )}!`,
                    color: 0x5865f2,
                    fields: [
                        {
                            name: "❤️ Current Streak:",
                            value: `${updatedUser.dailyStreak ?? 0} Day(s)`,
                        },
                        {
                            name: "💫 Next Check-in reward:",
                            value: getAmount(updatedUser.dailyTotal + 1),
                        },
                    ],
                    footer: {
                        text: "Come back tomorrow to continue your streak!",
                    },
                },
            ],
        });
    },
});
