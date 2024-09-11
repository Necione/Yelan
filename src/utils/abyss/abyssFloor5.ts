import { type AbyssMonster } from "../hunt";

const abyssFloor5Monsters: AbyssMonster[] = [
    {
        name: "Large Cryo Slime",
        minHp: 50,
        maxHp: 65,
        minDamage: 9,
        maxDamage: 11,
        image: "https://lh.elara.workers.dev/rpg/monsters/large_cryo_slime.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 20,
        defValue: 15,
        quantity: 2,
    },
    {
        name: "Large Pyro Slime",
        minHp: 40,
        maxHp: 55,
        minDamage: 9,
        maxDamage: 11,
        image: "https://lh.elara.workers.dev/rpg/monsters/large_pyro_slime.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 20,
        defValue: 15,
        quantity: 2,
    },
];

const abyssFloor5Drops = [{ item: "Wanderer's Advice", amount: 2 }];

export { abyssFloor5Drops, abyssFloor5Monsters };
