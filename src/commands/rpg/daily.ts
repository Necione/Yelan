import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, updateUserStreak } from "../../services";
import { cooldowns } from "../../utils";

export const daily = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Claim your daily check-in reward.")
        .setDMPermission(false),
    defer: { silent: false },
    execute: async (interaction, responder) => {
        const userProfile = await getProfileByUserId(interaction.user.id);
        if (!userProfile) return;

        const hasCooldown = cooldowns.get(
            userProfile,
            "daily",
            `⌚ You've already claimed your daily reward, try again %DURATION%`,
        );
        if (!hasCooldown.status) {
            return responder.edit(embedComment(hasCooldown.message, "Red"));
        }

        let reward: number;
        try {
            const updatedUser = await updateUserStreak(interaction.user.id);
            if (!updatedUser) {
                return responder.edit(
                    embedComment(
                        "An error occurred while updating your streak.",
                        "Red",
                    ),
                );
            }

            reward = updatedUser.dailyTotal; // Use the updated dailyTotal value

            await cooldowns.set(userProfile, "daily", 86400000); // 1 day in milliseconds
            return responder.edit({
                embeds: [
                    {
                        title: `🗓️ ${interaction.user.username}'s Daily Check-in`,
                        description: `You just claimed ${customEmoji.a.z_coins} \`${reward} ${texts.c.u}\`!`,
                        color: 0x5865F2,
                        fields: [
                            {
                                name: "❤️ Current Streak:",
                                value: `${updatedUser.dailyStreak ?? 0} Day(s)`,
                                inline: true,
                            },
                            {
                                name: "💫 Next Check-in reward:",
                                value: `${customEmoji.a.z_coins} \`${updatedUser.dailyTotal + 1} ${texts.c.u}\``, // Calculate the next reward
                                inline: false,
                            },
                        ],
                        footer: {
                            text: "Come back tomorrow to continue your streak!",
                        },
                    },
                ],
            });
        } catch (error) {
            console.error(error);
            return responder.edit(
                embedComment(
                    "An error occurred while claiming your daily reward.",
                    "Red",
                ),
            );
        }
    },
});