import { randomWeight } from "@elara-services/packages";
import { is, make } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type { Message } from "discord.js";
import "./events";
import { events, type RPGEvent } from "./events/utils";

export async function handleRandomEvent(
    message: Message,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const list = make.array<RPGEvent>();
    for (const e of events.values()) {
        let add = false;
        if (is.number(e.weight)) {
            add = true;
        }
        if (is.object(e.required)) {
            if (is.object(e.required.min)) {
                const { rebirths, rank } = e.required.min;

                if (is.number(rebirths) && stats.rebirths >= rebirths) {
                    add = true;
                }
                if (is.number(rank) && stats.adventureRank >= rank) {
                    add = true;
                }
            }
        }
        if (add) {
            list.push(e);
        }
    }
    const event = randomWeight(list);
    if (event) {
        return event.execute(message, stats, userWallet);
    }
}
