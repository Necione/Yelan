import { type PrefixCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";
import { cooldowns } from "../../utils";

export const cd: PrefixCommand = {
    enabled: true,
    name: "cd",
    async execute(message, r) {
        try {
            const userWallet = await getProfileByUserId(message.author.id);
            if (!userWallet) {
                return r.reply(
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
                .setThumbnail(message.author.displayAvatarURL());

            return r.reply({ embeds: [embed] });
        } catch (err) {
            return r.reply(
                embedComment("An error occurred while checking cooldowns."),
            );
        }
    },
};
