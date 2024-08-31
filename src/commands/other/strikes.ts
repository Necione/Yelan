import {
    buildCommand,
    getUser,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";

export const strikes = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`strikes`)
        .setDescription(`Check how many strikes a user has`)
        .setDMPermission(false)
        .addUserOption((o) =>
            getUser(o, {
                name: "user",
                description: `What user do you want to look at?`,
                required: false,
            }),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const user = i.options.getUser("user", false) || i.user;
        if (user.bot) {
            return r.edit(embedComment(`Bots can't have strikes...`));
        }

        const p = await getProfileByUserId(user.id);
        if (!p) {
            return r.edit(embedComment(`Unable to find/create user profile.`));
        }

        const strikes = p.strikes || 0;

        const embed = new EmbedBuilder()
            .setColor(0xff5856)
            .setTitle(`${user.username}'s Moderation Strikes`)
            .setDescription(
                `${user.toString()} has \`🔥\` **${strikes} Strike(s)**.\n-# Strikes will reset monthly on the 1st`,
            )
            .setAuthor({
                name: user.username,
                iconURL: user.displayAvatarURL(),
            })
            .setFooter({
                text: `⚠️ You will be banned permanently at 5 Strikes`,
            });

        return r.edit({
            embeds: [embed],
        });
    },
});
