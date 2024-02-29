import type { PrefixCommand } from "@elara-services/botbuilder";
import { createEvent, handleMessageCommand } from "@elara-services/botbuilder";
import { getFilesList } from "@elara-services/utils";
import { Events, type Message } from "discord.js";
import { handleUserToUID } from "../plugins/other/grader";
import { onAchievemntSubmit } from "../plugins/other/onSubmit";
import * as Commands from "../prefix-commands";

export const messageCreate = createEvent({
    name: Events.MessageCreate,
    async execute(message: Message) {
        if (message.author.bot || !message.inGuild() || !message.member) {
            return;
        }
        handleUserToUID(message);
        onAchievemntSubmit(message);
        if (message.client.prefix) {
            handleMessageCommand(
                message,
                getFilesList<PrefixCommand>(Commands),
                message.client.prefix,
            );
        }
    },
});
