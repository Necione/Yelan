import {
    buildCommand,
    type UserContextMenuCommand,
} from "@elara-services/botbuilder";
import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
import { fetchData } from "../quests";
export const quests = buildCommand<UserContextMenuCommand>({
    command: new ContextMenuCommandBuilder()
        .setName(`View Quests`)
        .setDMPermission(false)
        .setType(ApplicationCommandType.User),
    defer: { silent: true },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        return await r.edit(await fetchData(i.targetUser, i.member));
    },
});
