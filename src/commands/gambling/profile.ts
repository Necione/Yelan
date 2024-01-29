import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { is } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { fetchData } from "../../plugins/profile/utils";

export const profile = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`profile`)
        .setDescription(`View your profile or someone elses`)
        .setDMPermission(false)
        .addUserOption((o) =>
            o.setName(`user`).setDescription(`What user?`).setRequired(false),
        )
        .addBooleanOption((o) =>
            o
                .setName(`silent`)
                .setDescription(`Do you want the response to be silent?`)
                .setRequired(false),
        ),
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const priv = i.options.getBoolean("silent", false);
        await r.defer({ ephemeral: is.boolean(priv) ? priv : false });
        await r.edit(
            await fetchData(
                i.options.getUser("user", false) || i.user,
                i.member,
                priv ? false : true,
            ),
        );
    },
});
