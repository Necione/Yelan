import { make } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type { Message } from "discord.js";
import { injuredManEvent } from "../utils/events/injuredManEvent";
import { cliffFallEvent } from "./events/cliffFallEvent";
import { healingWellEvent } from "./events/healingWellEvent";
import { secretCultEvent } from "./events/secretCultEvent";
import { thiefEvent } from "./events/theifEvent";

export async function handleRandomEvent(
    message: Message,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const events = make.array([
        injuredManEvent,
        healingWellEvent,
        cliffFallEvent,
        secretCultEvent,
        thiefEvent,
    ]);

    const randomIndex = Math.floor(Math.random() * events.length);
    const randomEvent = events[randomIndex];

    await randomEvent(message, stats, userWallet);
}
