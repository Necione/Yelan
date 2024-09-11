import { type AbyssMonster } from "../hunt";

const abyssFloor2Monsters: AbyssMonster[] = [
    {
        name: "Pyro Slime",
        minHp: 50,
        maxHp: 75,
        minDamage: 10,
        maxDamage: 15,
        image: "https://lh.elara.workers.dev/rpg/monsters/pyro_slime.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 20,
        defValue: 5,
        quantity: 1,
    },
    {
        name: "Mitachurl",
        minHp: 50,
        maxHp: 75,
        minDamage: 10,
        maxDamage: 15,
        image: "https://lh.elara.workers.dev/rpg/monsters/mitachurl.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 20,
        defValue: 5,
        quantity: 1,
    },
];

const abyssFloor2Drops = [{ item: "Wanderer's Advice", amount: 2 }];

export { abyssFloor2Drops, abyssFloor2Monsters };

