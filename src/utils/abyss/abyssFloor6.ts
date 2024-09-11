import { type AbyssMonster } from "../hunt";

const abyssFloor6Monsters: AbyssMonster[] = [
    {
        name: "Frostarm Lawachurl",
        minHp: 75,
        maxHp: 125,
        minDamage: 10,
        maxDamage: 25,
        image: "https://lh.elara.workers.dev/rpg/monsters/frostarm_lawachurl.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 25,
        defValue: 30,
        quantity: 1,
    },
    {
        name: "Stonehide Lawachurl",
        minHp: 150,
        maxHp: 200,
        minDamage: 10,
        maxDamage: 15,
        image: "https://lh.elara.workers.dev/rpg/monsters/stonehide_lawachurl.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 25,
        defValue: 30,
        quantity: 1,
    },
    {
        name: "Cryo Abyss Mage",
        minHp: 200,
        maxHp: 250,
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

const abyssFloor6Drops = [{ item: "Wanderer's Advice", amount: 2 }];

export { abyssFloor6Drops, abyssFloor6Monsters };
