import {
    buildCommand,
    getUser,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { embedComment, formatNumber, proper } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { devId, roles } from "../../config";
import { getProfileByUserId } from "../../services";

export const strikes = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`strikes`)
        .setDescription(`Check your own strikes`)
        .setDMPermission(false)
        .addUserOption((o) =>
            getUser(o, {
                name: "user",
                description: "[STAFF]: What user do you want to check?",
                required: false,
            }),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        let user = i.user;
        const u = i.options.getUser("user", false);
        if (
            i.member.roles.cache.hasAny(...[...roles.main, roles.moderator]) &&
            u
        ) {
            user = u;
        }
        if (i.user.id !== devId && user.id === devId) {
            return r.edit(embedComment(`Respectfully, fuck off.`));
        }
        const term = i.user.id === user.id ? "your" : "their";
        if (user.bot) {
            return r.edit(embedComment(`Bots can't have strikes...`));
        }

        const p = await getProfileByUserId(user.id);
        if (!p) {
            return r.edit(embedComment(`No user profile found.`));
        }

        const strikes = p.strikes || 0;

        const embed = new EmbedBuilder()
            .setColor(0xff5856)
            .setTitle(`Moderation Strikes`)
            .setDescription(
                `${user.toString()} has \`🔥\` **${formatNumber(
                    strikes,
                )} Strike(s)**.\n-# Strikes will reset monthly on the 1st`,
            )
            .setAuthor({
                name: user.username,
                iconURL: user.displayAvatarURL(),
            })
            .setFooter({
                text: `⚠️ ${proper(
                    term === "their" ? "they" : term,
                )} will be banned permanently at 5 Strikes`,
            });

        return r.edit({
            embeds: [embed],
        });
    },
});
