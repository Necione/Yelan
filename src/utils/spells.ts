export interface Spell {
    spellName: string;
    description: string;
    cost: number;
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
        cost: 15,
    },
    Burn: {
        spellName: "Burn",
        description: "Deals 50% of the enemy's max HP as damage.",
        cost: 7,
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
};
