import { Events, createEvent, setPresence } from "@elara-services/botbuilder";
import { InviteClient } from "@elara-services/invite";
import { get, log } from "@elara-services/utils";
import type { ActivityType, Client, PresenceData } from "discord.js";
import { loadAllFonts } from "../plugins/canvas/common";
import { initializeGamblingMachines } from "../services";
import { updateInvitesCache } from "../utils";

export const ready = createEvent({
    name: Events.ClientReady,
    async execute(client: Client<true>) {
        client.invites = new InviteClient(client, { type: "memory" });
        await Promise.all([
            updateInvitesCache(client.invites, true),
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
        setInterval(
            () => updateInvitesCache(client.invites, true),
            get.mins(10),
        ); // Every 10 minutes from startup the bot will refresh the inviteCache
        // Why is this needed?
        // To not flood Discord with API calls. The `updateInvitesCache` fetches ALL invites for the server, due to pagination it takes ~12+ API calls to finish due to the size of the server.
    },
});
