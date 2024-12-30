import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, syncStats, updateUserStats } from "../../services";
import { cooldowns, debug, locked } from "../../utils";

export const worship = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("worship")
        .setDescription(
            "[RPG] Worship at the Statue of the Seven to heal for free.",
        )
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);

        try {
            const userProfile = await getProfileByUserId(i.user.id);
            if (!userProfile) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment(
                        "No profile found for your user. Please set up your profile.",
                        "Red",
                    ),
                );
            }

            const stats = await syncStats(i.user.id);

            if (!stats) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment(
                        `No stats found for you, please set up your profile.`,
                        "Red",
                    ),
                );
            }

            if (stats.isHunting || stats.abyssMode) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment("You cannot worship right now!", "Red"),
                );
            }

            const userWallet = await getProfileByUserId(i.user.id);
            if (!userWallet) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment("Unable to find/create your user profile."),
                );
            }

            const cc = cooldowns.get(userWallet, "worship");
            if (!cc.status) {
                locked.del(i.user.id);
                return r.edit(embedComment(cc.message));
            }

            const healAmount = Math.floor(0.5 * stats.maxHP);
            const newHp = Math.min(stats.hp + healAmount, stats.maxHP);

            const newResonance = (stats.resonance || 0) + 1;

            const cooldownDuration = get.hrs(3);

            await updateUserStats(i.user.id, {
                hp: { set: newHp },
                resonance: { set: newResonance },
            });

            await cooldowns.set(userProfile, "worship", cooldownDuration);

            const successEmbed = new EmbedBuilder()
                .setTitle("...")
                .setDescription(
                    `The world opens itself before those with noble hearts.\n\n\`💕\` You have been healed for \`${healAmount} HP\`!\n` +
                        `\`🌱\` Your Resonance has increased by \`1\`!`,
                )
                .setColor("Green")
                .setThumbnail(i.user.displayAvatarURL());

            return r.edit({ embeds: [successEmbed] });
        } catch (error) {
            debug("Error executing /worship command:", error);
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "An error occurred while trying to worship. Please try again later.",
                    "Red",
                ),
            );
        } finally {
            locked.del(i.user.id);
        }
    },
});
