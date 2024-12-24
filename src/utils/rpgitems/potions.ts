import { get } from "@elara-services/utils";
import type { DropName } from "./drops";

export const potions: {
    [key: string]: {
        solventOptions: string[];
        soluteOptions: DropName[][];
        brewTime: number;
        successRate: number;
        effect: {
            name: string;
            effectValue: number;
            time: number;
        };
        outputAmount: number;
    };
} = {
    Wine: {
        solventOptions: ["Water"],
        soluteOptions: [
            ["A Flower Yet to Bloom", "A Flower Yet to Bloom"],
            ["Treasured Flower", "Treasured Flower"],
            ["Wanderer's Blooming Flower", "Wanderer's Blooming Flower"],
        ],
        brewTime: get.mins(2),
        successRate: 0.8,
        effect: {
            name: "Weakness",
            effectValue: -0.5,
            time: 5,
        },
        outputAmount: 1,
    },
    "Potion of Evasion": {
        solventOptions: ["Water"],
        soluteOptions: [["Hunter's Sacrificial Knife"]],
        brewTime: get.mins(2),
        successRate: 0.8,
        effect: {
            name: "Evasion",
            effectValue: 0.4,
            time: 2,
        },
        outputAmount: 1,
    },
    "Greater Potion of Evasion": {
        solventOptions: ["Water"],
        soluteOptions: [["Agent's Sacrificial Knife"]],
        brewTime: get.mins(2),
        successRate: 0.8,
        effect: {
            name: "Evasion",
            effectValue: 0.6,
            time: 3,
        },
        outputAmount: 1,
    },
    "Superior Potion of Evasion": {
        solventOptions: ["Water"],
        soluteOptions: [["Inspector's Sacrificial Knife"]],
        brewTime: get.mins(2),
        successRate: 0.8,
        effect: {
            name: "Evasion",
            effectValue: 0.8,
            time: 5,
        },
        outputAmount: 1,
    },
    "Potion of Levitation": {
        solventOptions: ["Water"],
        soluteOptions: [["Mist Grass"], ["Mist Grass Wick"]],
        brewTime: get.mins(1),
        successRate: 0.8,
        effect: {
            name: "Levitation",
            effectValue: 1,
            time: 1,
        },
        outputAmount: 1,
    },
    "Lesser Strength Potion": {
        solventOptions: ["Water"],
        soluteOptions: [["Slime Secretions"], ["Stained Mask"]],
        brewTime: get.mins(1),
        successRate: 0.75,
        effect: {
            name: "Strength",
            effectValue: 1.2,
            time: 5,
        },
        outputAmount: 1,
    },
    "Greater Strength Potion": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Gear", "Concealed Claw"],
            ["Geode", "Famed Handguard"],
        ],
        brewTime: get.mins(3),
        successRate: 0.7,
        effect: {
            name: "Strength",
            effectValue: 2.0,
            time: 8,
        },
        outputAmount: 1,
    },
    "Mighty Strength Elixir": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Black Crystal Horn", "Spectral Heart"],
            ["Chaos Circuit", "Lieutenant's Insignia"],
        ],
        brewTime: get.mins(4),
        successRate: 0.65,
        effect: {
            name: "Strength",
            effectValue: 2.2,
            time: 5,
        },
        outputAmount: 1,
    },
    "Titanic Strength Serum": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Core", "Polarizing Prism"],
            ["Spectral Husk", "Faded Red Satin"],
        ],
        brewTime: get.mins(5),
        successRate: 0.6,
        effect: {
            name: "Strength",
            effectValue: 2.5,
            time: 4,
        },
        outputAmount: 1,
    },
    "Colossal Strength Draught": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Oculus", "Crystal Prism"],
            ["Operative's Constancy", "Rich Red Brocade"],
        ],
        brewTime: get.mins(6),
        successRate: 0.55,
        effect: {
            name: "Strength",
            effectValue: 2.8,
            time: 4,
        },
        outputAmount: 1,
    },
    "Ultimate Strength Potion": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Axis", "Concealed Unguis"],
            ["Golden Raven Insignia", "Lieutenant's Insignia"],
        ],
        brewTime: get.mins(7),
        successRate: 0.5,
        effect: {
            name: "Strength",
            effectValue: 3.0,
            time: 4,
        },
        outputAmount: 1,
    },
    "Power Surge Elixir": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Device", "Operative's Standard Pocket Watch"],
            ["Chaos Gear", "Spectral Heart"],
        ],
        brewTime: get.mins(8),
        successRate: 0.45,
        effect: {
            name: "Strength",
            effectValue: 2.7,
            time: 3,
        },
        outputAmount: 1,
    },
    "Beastmaster's Strength Serum": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Core", "Famed Handguard"],
            ["Chaos Circuit", "Geode"],
        ],
        brewTime: get.mins(9),
        successRate: 0.4,
        effect: {
            name: "Strength",
            effectValue: 2.9,
            time: 5,
        },
        outputAmount: 1,
    },
    "Vial of Regeneration": {
        solventOptions: ["Water"],
        soluteOptions: [["Slime Condensate"], ["Damaged Mask"]],
        brewTime: get.mins(1),
        successRate: 0.8,
        effect: {
            name: "Regeneration",
            effectValue: 0.1,
            time: 1,
        },
        outputAmount: 1,
    },
    "Minor Healing Potion": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Slime Concentrate", "Slime Concentrate"],
            ["Ominous Mask", "Ominous Mask"],
        ],
        brewTime: get.mins(1),
        successRate: 0.8,
        effect: {
            name: "Regeneration",
            effectValue: 0.2,
            time: 2,
        },
        outputAmount: 1,
    },
    "Basic Healing Elixir": {
        solventOptions: ["Water"],
        soluteOptions: [["Slime Secretions", "Stained Mask"]],
        brewTime: get.mins(2),
        successRate: 0.85,
        effect: {
            name: "Regeneration",
            effectValue: 0.35,
            time: 2,
        },
        outputAmount: 1,
    },
    "Healing Draught": {
        solventOptions: ["Water"],
        soluteOptions: [["Slime Concentrate", "Ominous Mask"]],
        brewTime: get.mins(3),
        successRate: 0.75,
        effect: {
            name: "Regeneration",
            effectValue: 0.5,
            time: 3,
        },
        outputAmount: 1,
    },
    "Enhanced Healing Potion": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Dead Ley Line Leaves", "Spectral Husk"],
            ["Recruit's Insignia", "Chaos Core"],
        ],
        brewTime: get.mins(4),
        successRate: 0.65,
        effect: {
            name: "Regeneration",
            effectValue: 0.6,
            time: 3,
        },
        outputAmount: 1,
    },
    "Superior Healing Elixir": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Ley Line Sprout", "Golden Raven Insignia"],
            ["Operative's Constancy", "Concealed Unguis"],
        ],
        brewTime: get.mins(5),
        successRate: 0.55,
        effect: {
            name: "Regeneration",
            effectValue: 0.75,
            time: 2,
        },
        outputAmount: 1,
    },
    "Advanced Healing Serum": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Mist Grass Wick", "Spectral Heart"],
            ["Operative's Standard Pocket Watch", "Black Crystal Horn"],
        ],
        brewTime: get.mins(6),
        successRate: 0.45,
        effect: {
            name: "Regeneration",
            effectValue: 0.85,
            time: 3,
        },
        outputAmount: 1,
    },
    "Potion of Full Restoration": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Concealed Claw", "Polarizing Prism"],
            ["Famed Handguard", "Life Essence"],
        ],
        brewTime: get.mins(7),
        successRate: 0.35,
        effect: {
            name: "Regeneration",
            effectValue: 1.0,
            time: 1,
        },
        outputAmount: 1,
    },
    "Elixir of Absolute Healing": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Lieutenant's Insignia", "Faded Red Satin"],
            ["Mist Grass", "Black Bronze Horn"],
        ],
        brewTime: get.mins(8),
        successRate: 0.25,
        effect: {
            name: "Regeneration",
            effectValue: 1.0,
            time: 2,
        },
        outputAmount: 1,
    },
    "Divine Healing Essence": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Golden Raven Insignia", "Polarizing Prism"],
            ["Famed Handguard", "Crystal Prism"],
        ],
        brewTime: get.mins(9),
        successRate: 0.2,
        effect: {
            name: "Regeneration",
            effectValue: 0.9,
            time: 3,
        },
        outputAmount: 1,
    },
    "Minor Resistance Potion": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Gear", "Faded Red Satin"],
            ["Sealed Scroll", "Chaos Axis"],
        ],
        brewTime: get.mins(5),
        successRate: 0.9,
        effect: {
            name: "Resistance",
            effectValue: 0.8,
            time: 4,
        },
        outputAmount: 1,
    },
    "Basic Resistance Elixir": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Black Crystal Horn", "Chaos Oculus"],
            ["Faded Red Satin", "Life Essence"],
        ],
        brewTime: get.mins(6),
        successRate: 0.8,
        effect: {
            name: "Resistance",
            effectValue: 0.7,
            time: 5,
        },
        outputAmount: 1,
    },
    "Resistance Draught": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Circuit", "Faded Red Satin"],
            ["Chaos Core", "Sealed Scroll"],
        ],
        brewTime: get.mins(7),
        successRate: 0.75,
        effect: {
            name: "Resistance",
            effectValue: 0.6,
            time: 3,
        },
        outputAmount: 1,
    },
    "Enhanced Resistance Potion": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Oculus", "Black Crystal Horn"],
            ["Chaos Axis", "Divining Scroll"],
        ],
        brewTime: get.mins(8),
        successRate: 0.7,
        effect: {
            name: "Resistance",
            effectValue: 0.5,
            time: 3,
        },
        outputAmount: 1,
    },
    "Superior Resistance Elixir": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Gear", "Spectral Husk"],
            ["Chaos Device", "Golden Raven Insignia"],
        ],
        brewTime: get.mins(9),
        successRate: 0.65,
        effect: {
            name: "Resistance",
            effectValue: 0.4,
            time: 3,
        },
        outputAmount: 1,
    },
    "Ultimate Resistance Serum": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Core", "Life Essence"],
            ["Chaos Device", "Spectral Heart"],
        ],
        brewTime: get.mins(10),
        successRate: 0.6,
        effect: {
            name: "Resistance",
            effectValue: 0.3,
            time: 2,
        },
        outputAmount: 1,
    },
    "Absolute Resistance Potion": {
        solventOptions: ["Water"],
        soluteOptions: [
            ["Chaos Axis", "Chaos Circuit"],
            ["Chaos Oculus", "Chaos Core"],
        ],
        brewTime: get.mins(10),
        successRate: 0.5,
        effect: {
            name: "Resistance",
            effectValue: 0.0,
            time: 1,
        },
        outputAmount: 1,
    },
} as const;

export type PotionName = keyof typeof potions;
