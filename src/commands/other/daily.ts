import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get, getPluralTxt } from "@elara-services/utils";
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
        if (!updatedUser.status) {
            return r.edit(embedComment(updatedUser.message));
        }

        await cooldowns.set(p, "daily", get.days(1));
        return r.edit({
            embeds: [
                {
                    title: `🗓️ ${i.user.username}'s Daily Check-in`,
                    description: `You just claimed ${getAmount(
                        updatedUser.data.dailyTotal,
                    )}!`,
                    color: 0x5865f2,
                    fields: [
                        {
                            name: "❤️ Current Streak:",
                            value: `${
                                updatedUser.data.dailyStreak ?? 0
                            } Day${getPluralTxt(
                                updatedUser.data.dailyStreak ?? 0,
                            )}`,
                        },
                        {
                            name: "💫 Next Check-in reward:",
                            value: getAmount(updatedUser.data.dailyTotal + 1),
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
