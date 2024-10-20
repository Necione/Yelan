import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Frost Fall",
    group: MonsterGroup.Abyss,
    minExp: 20,
    maxExp: 30,
    minWorldLevel: 16,
    image: "https://lh.elara.workers.dev/rpg/monsters/frost_fall.png",
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

    critChance: 20,
    critValue: 1.5,
    defChance: 50,
    defValue: 0.5,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 16,
                minHp: 880,
                maxHp: 980,
                minDamage: 55,
                maxDamage: 70,
            },
            {
                worldLevel: 17,
                minHp: 975,
                maxHp: 1075,
                minDamage: 70,
                maxDamage: 85,
            },
            {
                worldLevel: 18,
                minHp: 1070,
                maxHp: 1180,
                minDamage: 83,
                maxDamage: 100,
            },
            {
                worldLevel: 19,
                minHp: 1175,
                maxHp: 1280,
                minDamage: 102,
                maxDamage: 135,
            },
            {
                worldLevel: 20,
                minHp: 1340,
                maxHp: 1675,
                minDamage: 115,
                maxDamage: 160,
            },
            {
                worldLevel: 21,
                minHp: 1380,
                maxHp: 1700,
                minDamage: 120,
                maxDamage: 165,
            },
            {
                worldLevel: 22,
                minHp: 1425,
                maxHp: 1730,
                minDamage: 125,
                maxDamage: 170,
            },
            {
                worldLevel: 23,
                minHp: 1470,
                maxHp: 1760,
                minDamage: 130,
                maxDamage: 175,
            },
            {
                worldLevel: 24,
                minHp: 1515,
                maxHp: 1790,
                minDamage: 135,
                maxDamage: 180,
            },
            {
                worldLevel: 25,
                minHp: 1560,
                maxHp: 1820,
                minDamage: 140,
                maxDamage: 185,
            },
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
