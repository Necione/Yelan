import { Collection, is } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import { type Message } from "discord.js";

export type RPGEvent = {
    enabled: boolean;
    bypass: boolean;
    name: string;
    execute: (
        message: Message,
        stats: UserStats,
        userWallet: UserWallet,
    ) => Promise<unknown> | unknown;
    required: {
        min: {
            rank: number;
            rebirths: number;
            or: boolean;
            and: boolean;
        };
    };
    weight: number;
};

export const events = new Collection<string, RPGEvent>();

export function createEvent(options: {
    name: RPGEvent["name"];
    execute: RPGEvent["execute"];
    bypass?: RPGEvent["bypass"];
    enabled?: RPGEvent["enabled"];
    required?: Partial<{
        min: Partial<RPGEvent["required"]["min"]>;
    }>;
    weight?: RPGEvent["weight"];
}) {
    if (!is.string(options.name)) {
        throw new Error(`RPG Event doesn't have a 'name'`);
    }
    if (!options.execute || typeof options.execute !== "function") {
        throw new Error(
            `RPG Event (${options.name}) doesn't have an 'execute' function.`,
        );
    }
    if (events.has(options.name)) {
        throw new Error(`Duplicate RPG Event (${options.name})`);
    }
    const data = {
        enabled: is.boolean(options.enabled) ? options.enabled : true,
        bypass: is.boolean(options.bypass) ? options.bypass : false,
        name: options.name,
        execute: options.execute,
        required: {
            min: {
                rank: options.required?.min?.rank || 0,
                rebirths: options.required?.min?.rebirths || 0,
                or: is.boolean(options.required?.min?.or)
                    ? options.required.min.or
                    : true,
                and: is.boolean(options.required?.min?.and)
                    ? options.required.min.and
                    : false,
            },
        },
        weight: options.weight || 0,
    } as RPGEvent;
    events.set(data.name, data);
    return data;
}
