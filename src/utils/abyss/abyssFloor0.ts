import { AbyssMonster } from "../hunt";

const abyssFloor0Monsters: AbyssMonster[] = [
    {
        name: "Anemo Slime",
        minHp: 20,
        maxHp: 30,
        minDamage: 5,
        maxDamage: 10,
        image: "https://lh.elara.workers.dev/rpg/monsters/anemo_slime.png",
        critChance: 10,
        critValue: 1.5,
        defChance: 20,
        defValue: 2,
        quantity: 1,
    },
    {
        name: "Anemo Slime",
        minHp: 20,
        maxHp: 30,
        minDamage: 5,
        maxDamage: 10,
        image: "https://lh.elara.workers.dev/rpg/monsters/anemo_slime.png",
        critChance: 10,
        critValue: 1.5,
        defChance: 20,
        defValue: 2,
        quantity: 1,
    },
    {
        name: "Hilichurl",
        minHp: 30,
        maxHp: 40,
        minDamage: 10,
        maxDamage: 15,
        image: "https://lh.elara.workers.dev/rpg/monsters/hilichurl.png",
        critChance: 10,
        critValue: 1.5,
        defChance: 20,
        defValue: 2,
        quantity: 1,
    },
];

const abyssFloor0Drops = [{ item: "Wanderer's Advice", amount: 2 }];

export { abyssFloor0Drops, abyssFloor0Monsters };
