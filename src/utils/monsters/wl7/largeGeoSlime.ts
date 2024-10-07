import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Large Geo Slime",
    group: MonsterGroup.Slime,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 7,
    image: "https://lh.elara.workers.dev/rpg/monsters/large_geo_slime.png",
    drops: [
        {
            item: "Slime Secretions",
            minAmount: 1,
            maxAmount: 3,
            chance: 90,
        },
        {
            item: "Slime Concentrate",
            minAmount: 1,
            maxAmount: 2,
            chance: 75,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 10,
    critValue: 1.5,
    defchance: 90,
    defValue: 0.5,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 7,
                minHp: 60,
                maxHp: 222,
                minDamage: 10,
                maxDamage: 15,
            },
            {
                worldLevel: 8,
                minHp: 74,
                maxHp: 262.5,
                minDamage: 12,
                maxDamage: 17,
            },
            {
                worldLevel: 9,
                minHp: 87.5,
                maxHp: 304.5,
                minDamage: 14,
                maxDamage: 19,
            },
            {
                worldLevel: 10,
                minHp: 101.5,
                maxHp: 345,
                minDamage: 15,
                maxDamage: 20,
            },
            {
                worldLevel: 11,
                minHp: 115,
                maxHp: 427.5,
                minDamage: 17,
                maxDamage: 23,
            },
            {
                worldLevel: 12,
                minHp: 142.5,
                maxHp: 510,
                minDamage: 20,
                maxDamage: 25,
            },
            {
                worldLevel: 13,
                minHp: 170,
                maxHp: 592.5,
                minDamage: 23,
                maxDamage: 27,
            },
            {
                worldLevel: 14,
                minHp: 197.5,
                maxHp: 675,
                minDamage: 25,
                maxDamage: 30,
            },
            {
                worldLevel: 15,
                minHp: 225,
                maxHp: 757.5,
                minDamage: 27,
                maxDamage: 35,
            },
            {
                worldLevel: 16,
                minHp: 280,
                maxHp: 922.5,
                minDamage: 40,
                maxDamage: 50,
            },
            {
                worldLevel: 17,
                minHp: 307.5,
                maxHp: 1005,
                minDamage: 50,
                maxDamage: 60,
            },
            {
                worldLevel: 18,
                minHp: 335,
                maxHp: 1087.5,
                minDamage: 60,
                maxDamage: 75,
            },
            {
                worldLevel: 19,
                minHp: 362.5,
                maxHp: 1170,
                minDamage: 75,
                maxDamage: 100,
            },
            {
                worldLevel: 20,
                minHp: 445,
                maxHp: 1665,
                minDamage: 80,
                maxDamage: 120,
            },
        ];
        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
