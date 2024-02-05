import { config } from "dotenv";
config({ path: `${process.cwd()}/.env` });

import { loadEvents } from "@elara-services/botbuilder";
import { getFilesList, log, times } from "@elara-services/utils";
import { ActivityType, Client, IntentsBitField, Options } from "discord.js";
import * as events from "./events";
import { checkIfDeploy } from "./scripts/checks";
if (process.env.timeZone) {
    times.timeZone = process.env.timeZone;
}

declare module "discord.js" {
    export interface Client {
        prefix?: string;
    }
}

class BotClient extends Client {
    constructor(public prefix?: string) {
        super({
            intents: [
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMembers,
                IntentsBitField.Flags.GuildPresences,
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.MessageContent,
            ],
            rest: {
                offset: 100,
            },
            makeCache: Options.cacheWithLimits({
                MessageManager: {
                    maxSize: 200,
                },
            }),
            presence: {
                status: "dnd",
                activities: [
                    {
                        name: "Just starting up",
                        type: ActivityType.Listening,
                    },
                ],
            },
        });
        if (!checkIfDeploy()) {
            loadEvents(this, getFilesList(events));
            this.login(process.env.TOKEN).catch(console.error);
        }
    }
}

process.on("unhandledRejection", (reason: Error | string | undefined) => {
    if (!reason) {
        return;
    }
    const str = [reason instanceof Error ? reason.stack : reason].join(" ");
    if (!str) {
        return;
    }
    if (
        [
            "InteractionNotReplied",
            "Unknown interaction",
            "Unknown Webhook",
            "10062",
            "40060",
            "@sapphire/discord.js-utilities",
            "Interaction has already been acknowledged",
        ].some((c) => str.includes(c.toLowerCase()))
    ) {
        return;
    }
    log(str);
});
export default new BotClient(process.env.PREFIX);
