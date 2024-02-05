import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { SlashCommandBuilder } from "discord.js";
import { fetchData } from "../../plugins/quests";

export const quests = buildCommand<SlashCommand>({
    aliases: ["commissions"],
    command: new SlashCommandBuilder()
        .setName(`quests`)
        .setDescription(`View your available commissions.`)
        .setDMPermission(false)
        .addUserOption((option) =>
            option
                .setRequired(false)
                .setName("user")
                .setDescription("The user."),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const user = i.options.getUser("user") || i.user;
        if (!user) {
            return r.edit(`I was unable to find their user information.`);
        }
        return r.edit(await fetchData(user, i.member));
    },
});
