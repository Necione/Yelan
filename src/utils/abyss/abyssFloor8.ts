import { make } from "@elara-services/utils";
import { type AbyssMonster } from "../helpers/huntHelper";

export const abyssFloor8Monsters = make.array<AbyssMonster>([
    {
        name: "Treasure Hoarder Gravedigger",
        minHp: 300,
        maxHp: 400,
        minDamage: 30,
        maxDamage: 50,
        image: "https://lh.elara.workers.dev/rpg/monsters/treasure_hoarder_gravedigger.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 50,
        defValue: 50,
        quantity: 2,
    },
    {
        name: "Mutant Electro Slime",
        minHp: 350,
        maxHp: 400,
        minDamage: 10,
        maxDamage: 35,
        image: "https://lh.elara.workers.dev/rpg/monsters/mutant_electro_slime.png",
        critChance: 75,
        critValue: 3,
        defChance: 25,
        defValue: 15,
        quantity: 2,
    },
]);

export const abyssFloor8Drops = [{ item: "Wanderer's Advice", amount: 2 }];
