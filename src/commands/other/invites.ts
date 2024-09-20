import {
    buildCommand,
    getUser,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { discord, embedComment } from "@elara-services/utils";
import { type GuildMember, SlashCommandBuilder } from "discord.js";
import { roles } from "../../config";
import { generateInviteInfo } from "../../plugins/other/invites";
import { getProfileByUserId } from "../../services";
import { cooldowns } from "../../utils";

export const invites = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`invites`)
        .setDescription(`Track your invites in the server`)
        .setDMPermission(false)
        .addUserOption((o) =>
            getUser(o, {
                name: "user",
                description: `[STAFF]: What user do you want to look at?`,
                required: false,
            }),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const p = await getProfileByUserId(i.user.id);
        if (!p) {
            return r.edit(
                embedComment(`Unable to find/create your user profile.`),
            );
        }
        if (p.locked) {
            return r.edit(
                embedComment(
                    `You're user profile is locked, you can't use this command.`,
                ),
            );
        }
        const cool = cooldowns.get(
            p,
            "invites",
            `You can't lookup anyone until %DURATION%`,
        ); // Leave this in bitches, don't want Discord to get pissed at the bot and block it from using the endpoint.
        if (!cool.status) {
            return r.edit(embedComment(cool.message));
        }
        let user = i.user;
        const u = i.options.getUser("user", false);
        const isStaff = i.member.roles.cache.hasAny(
            ...[...roles.main, roles.moderator],
        );
        if (isStaff && u) {
            user = u;
        }
        if (!user || user.bot) {
            return r.edit(
                embedComment(`Unable to find that user or it's a bot account.`),
            );
        }
        const member = (await discord.member(
            i.guild,
            user.id,
            true,
            true,
        )) as GuildMember;
        if (!member) {
            return r.edit(
                embedComment(
                    `Unable to find ${user.toString()}'s member information in this server.`,
                ),
            );
        }
        const isSame = user.id === i.user.id;
        if (!isSame) {
            const pp = await getProfileByUserId(user.id);
            if (!pp) {
                return r.edit(
                    embedComment(
                        `Unable to find/create ${user.toString()}'s user profile.`,
                    ),
                );
            }
            if (pp.locked) {
                return r.edit(
                    embedComment(
                        `${user.toString()}'s user profile is locked, they don't have access to this command.`,
                    ),
                );
            }
        }
        return generateInviteInfo(i.guild, user.id, r);
    },
});
