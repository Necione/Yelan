import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Violet Lightning",
    group: MonsterGroup.Abyss,
    minExp: 10,
    maxExp: 25,
    minWorldLevel: 16,
    image: "https://lh.elara.workers.dev/rpg/monsters/violet_lightning.png",
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

    critChance: 40,
    critValue: 3,
    defChance: 85,
    defValue: 0.5,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 16,
                minHp: 860,
                maxHp: 955,
                minDamage: 52,
                maxDamage: 67,
            },
            {
                worldLevel: 17,
                minHp: 960,
                maxHp: 1060,
                minDamage: 66,
                maxDamage: 80,
            },
            {
                worldLevel: 18,
                minHp: 1055,
                maxHp: 1155,
                minDamage: 80,
                maxDamage: 95,
            },
            {
                worldLevel: 19,
                minHp: 1150,
                maxHp: 1245,
                minDamage: 98,
                maxDamage: 130,
            },
            {
                worldLevel: 20,
                minHp: 1300,
                maxHp: 1630,
                minDamage: 112,
                maxDamage: 155,
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
