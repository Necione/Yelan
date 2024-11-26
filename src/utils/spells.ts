import { calculateMasteryLevel } from "./masteryHelper";

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
        cost: 5,
    },
    Fury: {
        spellName: "Fury",
        description: "Makes your attack deal 2x damage.",
        cost: 13,
    },
    Burn: {
        spellName: "Burn",
        description: "Deals 50% of the enemy's max HP as damage.",
        cost: 12,
    },
    Cripple: {
        spellName: "Cripple",
        description: "Deals 20% of the enemy's max HP as damage.",
        cost: 3,
    },
    Stun: {
        spellName: "Stun",
        description: "The monter misses their __next__ attack.",
        cost: 10,
    },
    Poison: {
        spellName: "Poison",
        description: "The monster loses 20% of their HP per turn.",
        cost: 8,
        requiredMasteryLevel: 2,
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
