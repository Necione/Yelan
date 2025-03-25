import { calculateMasteryLevel } from "./helpers/masteryHelper";

export interface Spell {
    spellName: string;
    description: string;
    cost: number;
    requiredMasteryLevel?: number;
}

export const spells: Record<string, Spell> = {
    Heal: {
        spellName: "Heal",
        description: "Restores 15% of your max HP.",
        cost: 7,
    },
    Fury: {
        spellName: "Fury",
        description: "Makes your attack deal 2x damage.",
        cost: 20,
    },
    Burn: {
        spellName: "Burn",
        description: "Deals 50% of the enemy's current HP as damage.",
        cost: 15,
    },
    Cripple: {
        spellName: "Cripple",
        description: "Deals 10% of the enemy's max HP as damage.",
        cost: 7,
    },
    Stun: {
        spellName: "Stun",
        description: "The monter misses their __next__ attack.",
        cost: 15,
    },
    Poison: {
        spellName: "Poison",
        description: "The monster loses 20% of their max HP per turn.",
        cost: 17,
        requiredMasteryLevel: 2,
    },
    Flare: {
        spellName: "Flare",
        description: "Deal damage equal to half your current HP.",
        cost: 20,
        requiredMasteryLevel: 2,
    },
    Suffocate: {
        spellName: "Suffocate",
        description: "Disable all elemental damage.",
        cost: 25,
        requiredMasteryLevel: 3,
    },
    Immunity: {
        spellName: "Immunity",
        description: "Disable pressure from Demonic enemies for 3 turns.",
        cost: 35,
        requiredMasteryLevel: 6,
    },
    Meteor: {
        spellName: "Meteor",
        description: "Deal 10,000 flat damage.",
        cost: 70,
        requiredMasteryLevel: 7,
    },
};

export function getAvailableSpells(points: number): Spell[] {
    const mastery = calculateMasteryLevel(points);
    const currentLevel = mastery.numericLevel;
    return Object.values(spells).filter((spell) => {
        if (spell.requiredMasteryLevel) {
            return currentLevel >= spell.requiredMasteryLevel;
        }
        return true;
    });
}
