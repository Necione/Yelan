import { type AbyssMonster } from "../hunt";

export const abyssFloor7Monsters: AbyssMonster[] = [
    {
        name: "Hydro Abyss Mage",
        minHp: 100,
        maxHp: 200,
        minDamage: 10,
        maxDamage: 30,
        image: "https://lh.elara.workers.dev/rpg/monsters/hydro_abyss_mage.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 90,
        defValue: 50,
        quantity: 2,
    },
    {
        name: "Cryo Abyss Mage",
        minHp: 250,
        maxHp: 300,
        minDamage: 10,
        maxDamage: 35,
        image: "https://lh.elara.workers.dev/rpg/monsters/cryo_abyss_mage.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 25,
        defValue: 15,
        quantity: 1,
    },
];

export const abyssFloor7Drops = [{ item: "Wanderer's Advice", amount: 2 }];
