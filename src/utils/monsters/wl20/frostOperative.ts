import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Wind Operative",
    group: MonsterGroup.Fatui,
    minExp: 25,
    maxExp: 40,
    minWorldLevel: 20,
    image: "https://lh.elara.workers.dev/rpg/monsters/frost_operative.png",
    drops: [
        {
            item: "Old Operative's Pocket Watch",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
        {
            item: "Operative's Standard Pocket Watch",
            minAmount: 1,
            maxAmount: 1,
            chance: 25,
        },
    ],

    critChance: 50,
    critValue: 1.2,
    defChance: 20,
    defValue: 0.5,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 20,
                minHp: 2350,
                maxHp: 2660,
                minDamage: 280,
                maxDamage: 300,
            },
            {
                worldLevel: 21,
                minHp: 2500,
                maxHp: 2900,
                minDamage: 290,
                maxDamage: 330,
            },
            {
                worldLevel: 22,
                minHp: 2600,
                maxHp: 3000,
                minDamage: 320,
                maxDamage: 375,
            },
            {
                worldLevel: 23,
                minHp: 2700,
                maxHp: 3100,
                minDamage: 350,
                maxDamage: 450,
            },
            {
                worldLevel: 24,
                minHp: 2800,
                maxHp: 3200,
                minDamage: 440,
                maxDamage: 475,
            },
            {
                worldLevel: 25,
                minHp: 2900,
                maxHp: 3300,
                minDamage: 460,
                maxDamage: 500,
            },
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
