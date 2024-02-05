import {
    buildCommand,
    type UserContextMenuCommand,
} from "@elara-services/botbuilder";
import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
import { fetchData } from "../profile/utils";

export const profile = buildCommand<UserContextMenuCommand>({
    command: new ContextMenuCommandBuilder()
        .setName(`View Profile`)
        .setDMPermission(false)
        .setType(ApplicationCommandType.User),
    defer: { silent: true },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        return await r.edit(await fetchData(i.targetUser, i.member, false));
    },
});
