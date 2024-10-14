import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Eremite: Clearwater",
    group: MonsterGroup.Eremite,
    minExp: 10,
    maxExp: 25,
    minWorldLevel: 13,
    image: "https://lh.elara.workers.dev/rpg/monsters/clearwater.png",
    drops: [
        {
            item: "Faded Red Satin",
            minAmount: 1,
            maxAmount: 1,
            chance: 75,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 25,
    critValue: 2,
    defChance: 100,
    defValue: 0.1,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 13,
                minHp: 560,
                maxHp: 655,
                minDamage: 40,
                maxDamage: 50,
            },
            {
                worldLevel: 14,
                minHp: 760,
                maxHp: 755,
                minDamage: 50,
                maxDamage: 60,
            },
            {
                worldLevel: 15,
                minHp: 755,
                maxHp: 855,
                minDamage: 60,
                maxDamage: 70,
            },
            {
                worldLevel: 16,
                minHp: 860,
                maxHp: 955,
                minDamage: 70,
                maxDamage: 80,
            },
            {
                worldLevel: 17,
                minHp: 960,
                maxHp: 1060,
                minDamage: 80,
                maxDamage: 100,
            },
            {
                worldLevel: 18,
                minHp: 1055,
                maxHp: 1155,
                minDamage: 100,
                maxDamage: 110,
            },
            {
                worldLevel: 19,
                minHp: 1150,
                maxHp: 1245,
                minDamage: 110,
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
                maxHp: 1730,
                minDamage: 115,
                maxDamage: 160,
            },
            {
                worldLevel: 22,
                minHp: 1400,
                maxHp: 1800,
                minDamage: 120,
                maxDamage: 165,
            },
            {
                worldLevel: 23,
                minHp: 1450,
                maxHp: 1870,
                minDamage: 125,
                maxDamage: 170,
            },
            {
                worldLevel: 24,
                minHp: 1500,
                maxHp: 1940,
                minDamage: 130,
                maxDamage: 175,
            },
            {
                worldLevel: 25,
                minHp: 1550,
                maxHp: 2010,
                minDamage: 135,
                maxDamage: 180,
            },
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
