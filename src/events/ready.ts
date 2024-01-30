import { Events, createEvent, setPresence } from "@elara-services/botbuilder";
import { log } from "@elara-services/utils";
import type { ActivityType, Client, PresenceData } from "discord.js";
import { loadAllFonts } from "../plugins/canvas/common";
import { initializeGamblingMachines } from "../services";

export const ready = createEvent({
    name: Events.ClientReady,
    async execute(client: Client<true>) {
        await Promise.all([
            loadAllFonts(),
            initializeGamblingMachines(),
            setPresence(client, {
                name: process.env.ACTIVITY_NAME,
                status: process.env.STATUS as PresenceData["status"],
                type: process.env.ACTIVITY_TYPE as keyof typeof ActivityType,
                stream_url: process.env.STREAM_URL,
            }),
        ]);
        log(
            `[CLIENT]: ${client.user.tag} is now ready in ${client.guilds.cache.size} servers.`,
        );
    },
});
