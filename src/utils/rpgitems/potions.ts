import { get, make } from "@elara-services/utils";
import type { DropName } from "./drops";

export const potions = {
    Wine: {
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["A Flower Yet to Bloom", "A Flower Yet to Bloom"],
            ["Treasured Flower", "Treasured Flower"],
            ["Wanderer's Blooming Flower", "Wanderer's Blooming Flower"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([["Hunter's Sacrificial Knife"]]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([["Agent's Sacrificial Knife"]]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Inspector's Sacrificial Knife"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Mist Grass"],
            ["Mist Grass Wick"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Slime Secretions"],
            ["Stained Mask"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Gear", "Concealed Claw"],
            ["Geode", "Famed Handguard"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Black Crystal Horn", "Spectral Heart"],
            ["Chaos Circuit", "Lieutenant's Insignia"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Core", "Polarizing Prism"],
            ["Spectral Husk", "Faded Red Satin"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Oculus", "Crystal Prism"],
            ["Operative's Constancy", "Rich Red Brocade"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Axis", "Concealed Unguis"],
            ["Golden Raven Insignia", "Lieutenant's Insignia"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Device", "Operative's Standard Pocket Watch"],
            ["Chaos Gear", "Spectral Heart"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Core", "Famed Handguard"],
            ["Chaos Circuit", "Geode"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Slime Condensate"],
            ["Damaged Mask"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Slime Concentrate", "Slime Concentrate"],
            ["Ominous Mask", "Ominous Mask"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Slime Secretions", "Stained Mask"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Slime Concentrate", "Ominous Mask"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Dead Ley Line Leaves", "Spectral Husk"],
            ["Recruit's Insignia", "Chaos Core"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Ley Line Sprout", "Golden Raven Insignia"],
            ["Operative's Constancy", "Concealed Unguis"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Mist Grass Wick", "Spectral Heart"],
            ["Operative's Standard Pocket Watch", "Black Crystal Horn"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Concealed Claw", "Polarizing Prism"],
            ["Famed Handguard", "Life Essence"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Lieutenant's Insignia", "Faded Red Satin"],
            ["Mist Grass", "Black Bronze Horn"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Golden Raven Insignia", "Polarizing Prism"],
            ["Famed Handguard", "Crystal Prism"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Gear", "Faded Red Satin"],
            ["Sealed Scroll", "Chaos Axis"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Black Crystal Horn", "Chaos Oculus"],
            ["Faded Red Satin", "Life Essence"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Circuit", "Faded Red Satin"],
            ["Chaos Core", "Sealed Scroll"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Oculus", "Black Crystal Horn"],
            ["Chaos Axis", "Divining Scroll"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Gear", "Spectral Husk"],
            ["Chaos Device", "Golden Raven Insignia"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Core", "Life Essence"],
            ["Chaos Device", "Spectral Heart"],
        ]),
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
        solventOptions: make.array<string>(["Water"]),
        soluteOptions: make.array<DropName[]>([
            ["Chaos Axis", "Chaos Circuit"],
            ["Chaos Oculus", "Chaos Core"],
        ]),
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
