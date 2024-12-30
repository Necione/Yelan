import "dotenv/config";

import { loadEvents } from "@elara-services/botbuilder";
import { DMManager } from "@elara-services/dms";
import { EnkaVerificationClient } from "@elara-services/enka/dist/verification";
import type { InviteClient } from "@elara-services/invite";
import { getFilesList, log, times } from "@elara-services/utils";
import { ActivityType, Client, IntentsBitField, Options } from "discord.js";
import moment from "moment-timezone";
import * as events from "./events";
import { checkIfDeploy } from "./scripts/checks";
import { getProfileByUserId, updateRankedUID } from "./services";
import { debug } from "./utils";

if (process.env.timeZone) {
    moment.tz.setDefault(process.env.timeZone);
    times.timeZone = process.env.timeZone;
}

declare module "discord.js" {
    export interface Client {
        prefix?: string;
        enka: EnkaVerificationClient;
        invites: InviteClient;
        dms: DMManager;
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
            this.enka = new EnkaVerificationClient(this);
            this.dms = new DMManager(
                process.env.TOKEN as string,
                {
                    url: process.env.DATABASE_URL as string,
                    options: { dbName: "DMs" },
                },
                { offset: 0 },
            );
            this.enka.onVerificationFinish(async (data, user) => {
                const r = await getProfileByUserId(user.id);
                if (!r) {
                    return;
                }
                debug(
                    `[UID: FINISH]: ${user.tag} (${user.id}) set as ${data.uid}`,
                );
                await updateRankedUID(user.id, parseInt(data.uid));
                return;
            });
            loadEvents(this, getFilesList(events));
            this.login(process.env.TOKEN).catch(log);
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
