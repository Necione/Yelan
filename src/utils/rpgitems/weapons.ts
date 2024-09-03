export const weapons = {
    "Dull Blade": { sellPrice: 5, attackPower: 2 },
    "Waster Greatsword": { sellPrice: 5, attackPower: 3.5 },
};

export type WeaponName = keyof typeof weapons;
