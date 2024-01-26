import {
    handleInteractionCommand,
    type Event,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { getFilesList } from "@elara-services/utils";
import { Events, Interaction, InteractionReplyOptions } from "discord.js";
import * as Commands from "../commands";
import { embedComment, isInActiveTrade, locked } from "../utils";

export const interactionCreate: Event = {
    enabled: true,
    name: Events.InteractionCreate,
    async execute(i: Interaction) {
        handleInteractionCommand(
            i,
            getFilesList<SlashCommand>(Commands),
            (ii) => {
                if (!ii.isChatInputCommand()) {
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
            },
        );
    },
};
