import {
    buildCommand,
    getUser,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { discord, embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { generateInviteInfo } from "../../plugins/other/invites";
import { getProfileByUserId } from "../../services";

export const invites = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`invites`)
        .setDescription(`Track your invites in the server`)
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
        if (!user || user.bot) {
            return r.edit(
                embedComment(`Unable to find that user or it's a bot account.`),
            );
        }
        const member = await discord.member(i.guild, user.id, true, true);
        if (!member) {
            return r.edit(
                embedComment(
                    `Unable to find ${user.toString()}'s member information in this server.`,
                ),
            );
        }
        const p = await getProfileByUserId(user.id);
        if (!p) {
            return r.edit(
                embedComment(
                    `Unable to find/create ${user.toString()}'s user profile.`,
                ),
            );
        }
        if (p.locked) {
            return r.edit(
                embedComment(`${user.toString()}'s user profile is locked.`),
            );
        }
        return generateInviteInfo(i.guild, user.id, r);
    },
});
