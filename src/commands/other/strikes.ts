import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";

export const strikes = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`strikes`)
        .setDescription(`Check your own strikes`)
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const user = i.user;
        if (user.bot) {
            return r.edit(embedComment(`Bots can't have strikes...`));
        }

        const p = await getProfileByUserId(user.id);
        if (!p) {
            return r.edit(
                embedComment(`Unable to find/create your user profile.`),
            );
        }

        const strikes = p.strikes || 0;

        const yellowDot = "<:YellowDot:1110059185397317763>";
        const redDot = "<:RedDot:1110059185397317763>";
        const greenDot = "<:GreenDot:1110059185397317763>";

        let strikeBar = "";

        switch (strikes) {
            case 0:
                strikeBar = `${greenDot} ${greenDot} ${greenDot} ${greenDot} ${greenDot}`;
                break;
            case 1:
                strikeBar = `${yellowDot} ${greenDot} ${greenDot} ${greenDot} ${greenDot}`;
                break;
            case 2:
                strikeBar = `${yellowDot} ${yellowDot} ${greenDot} ${greenDot} ${greenDot}`;
                break;
            case 3:
                strikeBar = `${redDot} ${redDot} ${redDot} ${greenDot} ${greenDot}`;
                break;
            case 4:
                strikeBar = `${redDot} ${redDot} ${redDot} ${redDot} ${greenDot}`;
                break;
            case 5:
                strikeBar = `${redDot} ${redDot} ${redDot} ${redDot} ${redDot}`;
                break;
            default:
                strikeBar = `${greenDot} ${greenDot} ${greenDot} ${greenDot} ${greenDot}`;
        }

        const embed = new EmbedBuilder()
            .setColor(0xff5856)
            .setTitle(`Your Moderation Strikes`)
            .setDescription(
                `You currently have \`🔥\` **${strikes} Strike(s)**\n${strikeBar}\n\n-# Strikes will reset monthly on the 1st`,
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
