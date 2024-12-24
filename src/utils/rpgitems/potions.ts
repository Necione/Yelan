import { get } from "@elara-services/utils";
import type { DropName } from "./drops";

export const potions = {
    "Potion of Evasion": {
        solventOptions: ["Water"] as string[],
        soluteOptions: [["Hunter's Sacrificial Knife"]] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [["Agent's Sacrificial Knife"]] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [["Inspector's Sacrificial Knife"]] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [["Mist Grass"], ["Mist Grass Wick"]] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [["Slime Secretions"], ["Stained Mask"]] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Gear", "Concealed Claw"],
            ["Geode", "Famed Handguard"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Black Crystal Horn", "Spectral Heart"],
            ["Chaos Circuit", "Lieutenant's Insignia"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Core", "Polarizing Prism"],
            ["Spectral Husk", "Faded Red Satin"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Oculus", "Crystal Prism"],
            ["Operative's Constancy", "Rich Red Brocade"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Axis", "Concealed Unguis"],
            ["Golden Raven Insignia", "Lieutenant's Insignia"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Device", "Operative's Standard Pocket Watch"],
            ["Chaos Gear", "Spectral Heart"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Core", "Famed Handguard"],
            ["Chaos Circuit", "Geode"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [["Slime Condensate"], ["Damaged Mask"]] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Slime Concentrate", "Slime Concentrate"],
            ["Ominous Mask", "Ominous Mask"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [["Slime Secretions", "Stained Mask"]] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [["Slime Concentrate", "Ominous Mask"]] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Dead Ley Line Leaves", "Spectral Husk"],
            ["Recruit's Insignia", "Chaos Core"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Ley Line Sprout", "Golden Raven Insignia"],
            ["Operative's Constancy", "Concealed Unguis"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Mist Grass Wick", "Spectral Heart"],
            ["Operative's Standard Pocket Watch", "Black Crystal Horn"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Concealed Claw", "Polarizing Prism"],
            ["Famed Handguard", "Life Essence"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Lieutenant's Insignia", "Faded Red Satin"],
            ["Mist Grass", "Black Bronze Horn"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Golden Raven Insignia", "Polarizing Prism"],
            ["Famed Handguard", "Crystal Prism"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Gear", "Faded Red Satin"],
            ["Sealed Scroll", "Chaos Axis"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Black Crystal Horn", "Chaos Oculus"],
            ["Faded Red Satin", "Life Essence"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Circuit", "Faded Red Satin"],
            ["Chaos Core", "Sealed Scroll"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Oculus", "Black Crystal Horn"],
            ["Chaos Axis", "Divining Scroll"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Gear", "Spectral Husk"],
            ["Chaos Device", "Golden Raven Insignia"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Core", "Life Essence"],
            ["Chaos Device", "Spectral Heart"],
        ] as DropName[][],
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
        solventOptions: ["Water"] as string[],
        soluteOptions: [
            ["Chaos Axis", "Chaos Circuit"],
            ["Chaos Oculus", "Chaos Core"],
        ] as DropName[][],
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
