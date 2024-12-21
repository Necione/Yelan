import { is } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type { Message } from "discord.js";
import "./events";
import { events, type RPGEvent } from "./events/utils";

export async function handleRandomEvent(
    message: Message,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const eligibleEvents: RPGEvent[] = [];

    for (const e of events.values()) {
        if (!e.enabled) {
            continue;
        }

        if (e.bypass) {
            eligibleEvents.push(e);
            continue;
        }

        const minRequirements = e.required?.min;
        if (minRequirements) {
            const { rebirths, rank } = minRequirements;
            const hasRebirth = is.number(rebirths)
                ? stats.rebirths >= rebirths
                : true;
            const hasRank = is.number(rank)
                ? stats.adventureRank >= rank
                : true;

            if (hasRebirth && hasRank) {
                eligibleEvents.push(e);
            }
        } else {
            eligibleEvents.push(e);
        }
    }

    console.log(
        "Eligible Events:",
        eligibleEvents.map((event) => event.name),
    );

    if (eligibleEvents.length === 0) {
        console.log("No eligible events found for the user.");
        return;
    }

    const weightedList: RPGEvent[] = [];
    eligibleEvents.forEach((event) => {
        const eventWeight = event.weight > 0 ? event.weight : 1;
        for (let i = 0; i < eventWeight; i++) {
            weightedList.push(event);
        }
    });

    console.log(`Total events in weighted list: ${weightedList.length}`);

    const randomIndex = Math.floor(Math.random() * weightedList.length);
    const selectedEvent = weightedList[randomIndex];

    console.log("Selected Event:", selectedEvent.name);

    if (selectedEvent) {
        return selectedEvent.execute(message, stats, userWallet);
    }
}
