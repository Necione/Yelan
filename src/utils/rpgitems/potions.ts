import { get } from "@elara-services/utils";
import type { DropName } from "./drops";

export const potions = {
    "Vile of Regeneration": {
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Slime Condensate"],
            ["Damaged Mask"],
            ["Firm Arrowhead"],
        ] as DropName[][],
        brewTime: get.mins(1),
        successRate: 1,
        effect: {
            name: "Regeneration",
            effectValue: 1.2,
            time: 1,
        },
        outputAmount: 1,
    },
    "Long Vile of Regeneration": {
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Slime Condensate", "Divining Scroll"],
            ["Damaged Mask", "Divining Scroll"],
            ["Firm Arrowhead", "Divining Scroll"],
        ] as DropName[][],
        brewTime: get.mins(1),
        successRate: 1,
        effect: {
            name: "Regeneration",
            effectValue: 1.2,
            time: 3,
        },
        outputAmount: 1,
    },
    "Lesser Strength Potion": {
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Slime Secretions"],
            ["Stained Mask"],
            ["Sharp Arrowhead"],
        ] as DropName[][],
        brewTime: get.mins(1),
        successRate: 0.75,
        effect: {
            name: "Strength",
            effectValue: 1.2,
            time: 5,
        },
        outputAmount: 1,
    },
    "Strength Potion": {
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Slime Concentrate"],
            ["Ominous Mask"],
            ["Weathered Arrowhead"],
        ] as DropName[][],
        brewTime: get.mins(1),
        successRate: 0.5,
        effect: {
            name: "Strength",
            effectValue: 1.5,
            time: 5,
        },
        outputAmount: 1,
    },
} as const;

export type PotionName = keyof typeof potions;
