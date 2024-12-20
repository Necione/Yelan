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
        if (is.object(e.required)) {
            if (is.object(e.required.min)) {
                const { rebirths, rank, and, or } = e.required.min;
                const hasRebirth = is.number(rebirths)
                    ? stats.rebirths >= rebirths
                    : null;
                const hasRank = is.number(rank)
                    ? stats.adventureRank >= rank
                    : null;

                if (!is.null(hasRebirth) || !is.null(hasRank)) {
                    if (or === true) {
                        if (hasRank || hasRebirth) {
                            list.push(e);
                            continue;
                        }
                    } else if (and === true) {
                        if (hasRank && hasRebirth) {
                            list.push(e);
                            continue;
                        }
                    }
                }
            }
        }
        list.push(e);
        continue;
    }
    const event = randomWeight(list);
    if (event) {
        return event.execute(message, stats, userWallet);
    }
}
