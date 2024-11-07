import type { UserStats, UserWallet } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import { injuredManEvent } from "../utils/events/injuredManEvent";
import { cliffFallEvent } from "./events/cliffFallEvent";
import { healingWellEvent } from "./events/healingWellEvent";
import { secretCultEvent } from "./events/secretCultEvent";
import { sirenEvent } from "./events/sirenEvent";

export async function handleRandomEvent(
    i: ChatInputCommandInteraction,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const events = [
        injuredManEvent,
        healingWellEvent,
        cliffFallEvent,
        secretCultEvent,
        sirenEvent,
    ];

    const randomIndex = Math.floor(Math.random() * events.length);
    const randomEvent = events[randomIndex];

    await randomEvent(i, stats, userWallet);
}
