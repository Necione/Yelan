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
        if (e.enabled === false) {
            continue;
        }
        if (e.bypass === true) {
            list.push(e);
            continue;
        }
        let add = true;
        if (is.object(e.required)) {
            if (is.object(e.required.min)) {
                const { rebirths, rank, and, or } = e.required.min;
                const res = {
                    rebirths: false,
                    rank: false,
                };
                if (is.number(rebirths)) {
                    if (stats.rebirths < rebirths) {
                        res.rebirths = true;
                    } else {
                        res.rebirths = false;
                    }
                }
                if (is.number(rank)) {
                    if (stats.adventureRank < rank) {
                        res.rank = true;
                    } else {
                        res.rank = false;
                    }
                }
                if (is.boolean(or)) {
                    if (or === true) {
                        if ([res.rank, res.rebirths].includes(false)) {
                            add = false;
                        }
                    }
                } else if (is.boolean(and)) {
                    if (and === true) {
                        if (!res.rank && !res.rebirths) {
                            add = false;
                        }
                    }
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
