import { make } from "@elara-services/utils";
import { type AbyssMonster } from "../hunt";

export const abyssFloor9Monsters = make.array<AbyssMonster>([
    {
        name: "Large Cryo Slime",
        minHp: 100,
        maxHp: 200,
        minDamage: 25,
        maxDamage: 50,
        image: "https://lh.elara.workers.dev/rpg/monsters/large_cryo_slime.png",
        critChance: 50,
        critValue: 1.5,
        defChance: 50,
        defValue: 50,
        quantity: 5,
    },
    {
        name: "Hydro Hilichurl Rogue",
        minHp: 500,
        maxHp: 600,
        minDamage: 30,
        maxDamage: 75,
        image: "https://lh.elara.workers.dev/rpg/monsters/hydro_hilichurl_rogue.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 50,
        defValue: 50,
        quantity: 1,
    },
]);

export const abyssFloor9Drops = [{ item: "Wanderer's Advice", amount: 2 }];
