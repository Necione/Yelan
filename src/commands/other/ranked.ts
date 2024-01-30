import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { SlashCommandBuilder } from "discord.js";
import { fetchData } from "../../plugins/other/ranked";

export const ranked = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`ranked`)
        .setDescription(`View your or another user's Ranked TCG stats!`)
        .setDMPermission(false)
        .addUserOption((option) =>
            option
                .setName(`user`)
                .setDescription(`What user do you want to check?`)
                .setRequired(false),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const user = i.options.getUser("user", false) || i.user;
        return r.edit(await fetchData(user, i.member));
    },
});
