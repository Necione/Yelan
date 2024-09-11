import { type AbyssMonster } from "../hunt";

const abyssFloor1Monsters: AbyssMonster[] = [
    {
        name: "Cryo Slime",
        minHp: 30,
        maxHp: 50,
        minDamage: 5,
        maxDamage: 15,
        image: "https://lh.elara.workers.dev/rpg/monsters/cryo_slime.png",
        critChance: 10,
        critValue: 1.5,
        defChance: 20,
        defValue: 2,
        quantity: 1,
    },
    {
        name: "Mitachurl",
        minHp: 30,
        maxHp: 50,
        minDamage: 6,
        maxDamage: 10,
        image: "https://lh.elara.workers.dev/rpg/monsters/mitachurl.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 20,
        defValue: 5,
        quantity: 1,
    },
];

const abyssFloor1Drops = [{ item: "Wanderer's Advice", amount: 2 }];

export { abyssFloor1Drops, abyssFloor1Monsters };

