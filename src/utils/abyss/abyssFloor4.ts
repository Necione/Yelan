import { make } from "@elara-services/utils";
import { type AbyssMonster } from "../hunt";

export const abyssFloor4Monsters = make.array<AbyssMonster>([
    {
        name: "Anemo Samachurl",
        minHp: 90,
        maxHp: 125,
        minDamage: 25,
        maxDamage: 40,
        image: "https://lh.elara.workers.dev/rpg/monsters/anemo_samachurl.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 20,
        defValue: 10,
        quantity: 1,
    },
    {
        name: "Dendro Slime",
        minHp: 45,
        maxHp: 60,
        minDamage: 8,
        maxDamage: 12,
        image: "https://lh.elara.workers.dev/rpg/monsters/dendro_slime.png",
        critChance: 25,
        critValue: 1.5,
        defChance: 20,
        defValue: 5,
        quantity: 2,
    },
]);

export const abyssFloor4Drops = [{ item: "Wanderer's Advice", amount: 2 }];
