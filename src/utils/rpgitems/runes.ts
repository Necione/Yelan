export const runes = {
    "Lightning Rune": {
        sellPrice: 15,
        attackPower: { min: 5, max: 10 },
        critChance: { min: 5, max: 10 },
        critValue: { min: 0.05, max: 0.15 },
        maxHP: { min: 0, max: 25 },
        defChance: { min: -5, max: 5 },
        defValue: { min: 0, max: 10 },
        additionalMana: { min: 0, max: 5 },
        minadventurerank: 5,
    },
    "Snow Rune": {
        sellPrice: 15,
        attackPower: { min: -5, max: 5 },
        critChance: { min: 0, max: 5 },
        critValue: { min: 0, max: 0.1 },
        maxHP: { min: 25, max: 75 },
        defChance: { min: 5, max: 15 },
        defValue: { min: 10, max: 25 },
        additionalMana: { min: 0, max: 5 },
        minadventurerank: 5,
    },
};

export type RuneName = keyof typeof runes;
