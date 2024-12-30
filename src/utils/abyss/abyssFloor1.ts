import { make } from "@elara-services/utils";
import { type AbyssMonster } from "../helpers/huntHelper";

export const abyssFloor1Monsters = make.array<AbyssMonster>([
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
]);

export const abyssFloor1Drops = [{ item: "Wanderer's Advice", amount: 2 }];
