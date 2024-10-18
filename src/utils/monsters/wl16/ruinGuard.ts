import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Ruin Guard",
    group: MonsterGroup.Machine,
    minExp: 20,
    maxExp: 30,
    minWorldLevel: 16,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_guard.png",
    drops: [
        {
            item: "Chaos Device",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
    ],

    critChance: 0,
    critValue: 0,
    defChance: 0,
    defValue: 0,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 16,
                minHp: 870,
                maxHp: 967,
                minDamage: 50,
                maxDamage: 64,
            },
            {
                worldLevel: 17,
                minHp: 967,
                maxHp: 1065,
                minDamage: 64,
                maxDamage: 76,
            },
            {
                worldLevel: 18,
                minHp: 1065,
                maxHp: 1163,
                minDamage: 76,
                maxDamage: 93,
            },
            {
                worldLevel: 19,
                minHp: 1163,
                maxHp: 1260,
                minDamage: 95,
                maxDamage: 124,
            },
            {
                worldLevel: 20,
                minHp: 1320,
                maxHp: 1650,
                minDamage: 107,
                maxDamage: 148,
            },
            {
                worldLevel: 21,
                minHp: 1380,
                maxHp: 1750,
                minDamage: 110,
                maxDamage: 155,
            },
            {
                worldLevel: 22,
                minHp: 1440,
                maxHp: 1800,
                minDamage: 115,
                maxDamage: 160,
            },
            {
                worldLevel: 23,
                minHp: 1500,
                maxHp: 1850,
                minDamage: 120,
                maxDamage: 165,
            },
            {
                worldLevel: 24,
                minHp: 1560,
                maxHp: 1900,
                minDamage: 125,
                maxDamage: 170,
            },
            {
                worldLevel: 25,
                minHp: 1620,
                maxHp: 1950,
                minDamage: 130,
                maxDamage: 175,
            },
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
