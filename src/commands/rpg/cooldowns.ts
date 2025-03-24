import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";
import { cooldowns } from "../../utils";

export const cooldownsCmd = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("cooldowns")
        .setDescription("[RPG] Check your cooldowns for various activities.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        try {
            const userWallet = await getProfileByUserId(i.user.id);
            if (!userWallet) {
                return r.edit(
                    embedComment("Unable to find your user profile."),
                );
            }

            const huntCooldown = cooldowns.get(userWallet, "hunt");
            const gatherCooldown = cooldowns.get(userWallet, "gather");
            const fishCooldown = cooldowns.get(userWallet, "fish");
            const exploreCooldown = cooldowns.get(userWallet, "explore");

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("Your Cooldowns")
                .setDescription(
                    `🗡️ Hunt: ${
                        huntCooldown.status ? "Ready!" : huntCooldown.message
                    }\n` +
                        `🌿 Gather: ${
                            gatherCooldown.status
                                ? "Ready!"
                                : gatherCooldown.message
                        }\n` +
                        `🎣 Fish: ${
                            fishCooldown.status
                                ? "Ready!"
                                : fishCooldown.message
                        }\n` +
                        `🗺️ Explore: ${
                            exploreCooldown.status
                                ? "Ready!"
                                : exploreCooldown.message
                        }`,
                )
                .setThumbnail(i.user.displayAvatarURL());

            return r.edit({ embeds: [embed] });
        } catch (err) {
            return r.edit(
                embedComment("An error occurred while checking cooldowns."),
            );
        }
    },
});
