import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { roles } from "../../config";

export const access = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`access`)
        .setDescription("Get or remove the Flash Giveaways role")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const member = i.member;
        if (!member.roles.cache.hasAny(...[...roles.levels, ...roles.main])) {
            return r.edit(
                embedComment(
                    `You must be Coffee (Lv1) or higher to use this command.\nCheck your level with \`/profile\`.`,
                ),
            );
        }

        const type = member.roles.cache.has(roles.flashRole);
        await r.edit(
            embedComment(
                `One moment, ${type ? "removing" : "adding"} the role to you ${
                    customEmoji.a.loading
                }`,
                "Yellow",
            ),
        );
        await member.roles[type ? "remove" : "add"](roles.flashRole).catch(
            noop,
        );
        return r.edit(
            embedComment(
                `Your Giveaway role has been ${
                    type
                        ? "removed, you can no longer join Flash Giveaways..."
                        : "added, you can now join Flash Giveaways!"
                }.`,
                type ? "Grey" : "Green",
            ),
        );
    },
});
