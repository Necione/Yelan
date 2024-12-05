import { getRandom, make } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type { Message } from "discord.js";
import * as ev from "./events";

export async function handleRandomEvent(
    message: Message,
    stats: UserStats,
    userWallet: UserWallet,
) {
    await getRandom(
        make.array([
            ev.injuredManEvent,
            ev.healingWellEvent,
            ev.cliffFallEvent,
            ev.secretCultEvent,
            ev.thiefEvent,
            ev.merchantEvent,
        ]),
    )(message, stats, userWallet);
}
