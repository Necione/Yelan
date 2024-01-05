import {
    handleInteractionCommand,
    type Event,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { getFilesList, is } from "@elara-services/utils";
import { Events, Interaction, InteractionReplyOptions } from "discord.js";
import * as Commands from "../commands";
import { embedComment, locked } from "../utils";

export const interactionCreate: Event = {
    enabled: true,
    name: Events.InteractionCreate,
    async execute(i: Interaction) {
        handleInteractionCommand(i, getFilesList<SlashCommand>(Commands), (ii, cmd) => {
            if (!ii.isChatInputCommand()) {
                return false;
            }
            const send = async (options: InteractionReplyOptions) => {
                if (ii.deferred) {
                    return ii.editReply(options).catch(() => null);
                } else {
                    return ii.reply({
                        ...options,
                        ephemeral: true
                    }).catch(() => null);
                }
            }
            if (is.object(cmd.only)) {
                if (cmd.only.threads === true && !ii.channel?.isThread()) {
                    send(embedComment(`You can only use this command in a threads channel!`));
                    return false;
                }
            }
            const busy = locked.has(i.user.id);
            if (busy) {
                send(embedComment(
                    `⏱️ You're currently waiting for \`/${busy.name}\` command to finish, you can't use any other commands until then.`,
                ))
                return false;
            }
            return true;
        });
    },
};
