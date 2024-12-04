import { make } from "@elara-services/utils";
import { type AbyssMonster } from "../hunt";

export const abyssFloor2Monsters = make.array<AbyssMonster>([
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
]);

export const abyssFloor2Drops = [{ item: "Wanderer's Advice", amount: 2 }];
