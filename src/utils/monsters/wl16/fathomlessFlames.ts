import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Fathomless Flames",
    group: MonsterGroup.Abyss,
    minExp: 20,
    maxExp: 30,
    minWorldLevel: 16,
    image: "https://lh.elara.workers.dev/rpg/monsters/fathomless_flame.png",
    drops: [
        {
            item: "Dead Ley Line Branch",
            minAmount: 1,
            maxAmount: 2,
            chance: 75,
        },
        {
            item: "Dead Ley Line Leaves",
            minAmount: 1,
            maxAmount: 2,
            chance: 25,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 75,
    critValue: 2.5,
    defChance: 50,
    defValue: 0.5,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 16,
                minHp: 870,
                maxHp: 967,
                minDamage: 53,
                maxDamage: 68,
            },
            {
                worldLevel: 17,
                minHp: 967,
                maxHp: 1065,
                minDamage: 68,
                maxDamage: 81,
            },
            {
                worldLevel: 18,
                minHp: 1065,
                maxHp: 1163,
                minDamage: 81,
                maxDamage: 98,
            },
            {
                worldLevel: 19,
                minHp: 1163,
                maxHp: 1260,
                minDamage: 100,
                maxDamage: 131,
            },
            {
                worldLevel: 20,
                minHp: 1320,
                maxHp: 1650,
                minDamage: 113,
                maxDamage: 156,
            },
            {
                worldLevel: 21,
                minHp: 1350,
                maxHp: 1750,
                minDamage: 120,
                maxDamage: 165,
            },
            {
                worldLevel: 22,
                minHp: 1400,
                maxHp: 1800,
                minDamage: 125,
                maxDamage: 170,
            },
            {
                worldLevel: 23,
                minHp: 1450,
                maxHp: 1850,
                minDamage: 130,
                maxDamage: 175,
            },
            {
                worldLevel: 24,
                minHp: 1500,
                maxHp: 1900,
                minDamage: 135,
                maxDamage: 180,
            },
            {
                worldLevel: 25,
                minHp: 1550,
                maxHp: 1950,
                minDamage: 140,
                maxDamage: 185,
            },
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
