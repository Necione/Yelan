export const weapons = {
    "Dull Blade": { sellPrice: 5, attackPower: 2, critChance: 0, critValue: 0 },
    "Waster Greatsword": {
        sellPrice: 5,
        attackPower: 3.5,
        critChance: 10,
        critValue: 1.5,
    },
    "Iron Point": {
        sellPrice: 8,
        attackPower: 4,
        critChance: 15,
        critValue: 1.75,
    },
    "Silver Sword": {
        sellPrice: 8,
        attackPower: 4.5,
        critChance: 15,
        critValue: 2,
    },
    "Cool Steel": {
        sellPrice: 10,
        attackPower: 5,
        critChance: 15,
        critValue: 2.5,
    },
};

export type WeaponName = keyof typeof weapons;
