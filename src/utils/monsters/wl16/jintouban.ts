import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Nobushi: Jintouban",
    group: MonsterGroup.Nobushi,
    minExp: 20,
    maxExp: 30,
    minWorldLevel: 16,
    image: "https://lh.elara.workers.dev/rpg/monsters/jintouban.png",
    critChance: 25,
    critValue: 7.5,
    defChance: 50,
    defValue: 0.5,
    drops: [
        {
            item: "Old Handguard",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
    ],

    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
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
