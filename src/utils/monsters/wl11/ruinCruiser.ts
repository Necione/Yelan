import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Ruin Cruiser",
    group: MonsterGroup.Machine,
    minExp: 10,
    maxExp: 20,
    minWorldLevel: 11,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_cruiser.png",
    drops: [
        {
            item: "Chaos Device",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
    ],

    critChance: 5,
    critValue: 5,
    defChance: 50,
    defValue: 0.25,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 11,
                minHp: 320,
                maxHp: 360,
                minDamage: 25,
                maxDamage: 32,
            },
            {
                worldLevel: 12,
                minHp: 365,
                maxHp: 415,
                minDamage: 28,
                maxDamage: 35,
            },
            {
                worldLevel: 13,
                minHp: 415,
                maxHp: 470,
                minDamage: 31,
                maxDamage: 38,
            },
            {
                worldLevel: 14,
                minHp: 470,
                maxHp: 525,
                minDamage: 33,
                maxDamage: 40,
            },
            {
                worldLevel: 15,
                minHp: 525,
                maxHp: 580,
                minDamage: 36,
                maxDamage: 44,
            },
            {
                worldLevel: 16,
                minHp: 580,
                maxHp: 645,
                minDamage: 42,
                maxDamage: 54,
            },
            {
                worldLevel: 17,
                minHp: 645,
                maxHp: 710,
                minDamage: 54,
                maxDamage: 65,
            },
            {
                worldLevel: 18,
                minHp: 710,
                maxHp: 775,
                minDamage: 65,
                maxDamage: 78,
            },
            {
                worldLevel: 19,
                minHp: 775,
                maxHp: 840,
                minDamage: 80,
                maxDamage: 105,
            },
            {
                worldLevel: 20,
                minHp: 880,
                maxHp: 1100,
                minDamage: 90,
                maxDamage: 125,
            },
            {
                worldLevel: 21,
                minHp: 900,
                maxHp: 1150,
                minDamage: 95,
                maxDamage: 130,
            },
            {
                worldLevel: 22,
                minHp: 950,
                maxHp: 1200,
                minDamage: 100,
                maxDamage: 135,
            },
            {
                worldLevel: 23,
                minHp: 1000,
                maxHp: 1250,
                minDamage: 105,
                maxDamage: 140,
            },
            {
                worldLevel: 24,
                minHp: 1050,
                maxHp: 1300,
                minDamage: 110,
                maxDamage: 145,
            },
            {
                worldLevel: 25,
                minHp: 1100,
                maxHp: 1350,
                minDamage: 115,
                maxDamage: 150,
            },
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
