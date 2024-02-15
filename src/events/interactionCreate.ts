import {
    createEvent,
    handleInteractionCommand,
} from "@elara-services/botbuilder";
import { embedComment, getFilesList } from "@elara-services/utils";
import type { Interaction, InteractionReplyOptions } from "discord.js";
import { Events } from "discord.js";
import * as Commands from "../commands";
import * as context from "../plugins/context";
import { onRickRoll } from "../plugins/other/rickroll";
import { handleInteractions } from "../plugins/pets";
import { onInteraction } from "../plugins/profile";
import { isInActiveTrade, locked } from "../utils";

export const interactionCreate = createEvent({
    name: Events.InteractionCreate,
    async execute(i: Interaction) {
        if (i.isModalSubmit()) {
            if (i.customId.startsWith("rickroll:")) {
                return onRickRoll(i);
            }
        }
        if ("customId" in i) {
            if (i.customId.startsWith("profile|")) {
                return onInteraction(i);
            }
        }
        if (
            "customId" in i &&
            ["pet:", "pets:"].some((c) => i.customId.startsWith(c))
        ) {
            return handleInteractions(i);
        }
        if (i.isChatInputCommand()) {
            return handleCommands(i, Commands);
        }
        if (i.isContextMenuCommand()) {
            return handleCommands(i, context);
        }
    },
});

function handleCommands(i: Interaction, commands: object) {
    return handleInteractionCommand(i, getFilesList<any>(commands), (ii) => {
        if (!ii.isCommand()) {
            return false;
        }
        const send = async (options: InteractionReplyOptions) => {
            if (ii.deferred) {
                return ii.editReply(options).catch(() => null);
            } else {
                return ii
                    .reply({
                        ...options,
                        ephemeral: true,
                    })
                    .catch(() => null);
            }
        };
        // @ts-ignore
        if (isInActiveTrade(ii)) {
            return false;
        }

        const busy = locked.has(i.user.id);
        if (busy) {
            send(
                embedComment(
                    `⏱️ You're currently waiting for \`/${busy.name}\` command to finish, you can't use any other commands until then.`,
                ),
            );
            return false;
        }
        return true;
    });
}
