import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Eremite: Sunfrost",
    group: MonsterGroup.Eremite,
    minExp: 10,
    maxExp: 25,
    minWorldLevel: 13,
    image: "https://lh.elara.workers.dev/rpg/monsters/sunfrost.png",
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

    critChance: 75,
    critValue: 1.5,
    defChance: 100,
    defValue: 0.1,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 13,
                minHp: 90,
                maxHp: 630,
                minDamage: 35,
                maxDamage: 45,
            },
            {
                worldLevel: 14,
                minHp: 740,
                maxHp: 730,
                minDamage: 45,
                maxDamage: 55,
            },
            {
                worldLevel: 15,
                minHp: 735,
                maxHp: 830,
                minDamage: 55,
                maxDamage: 65,
            },
            {
                worldLevel: 16,
                minHp: 840,
                maxHp: 930,
                minDamage: 65,
                maxDamage: 75,
            },
            {
                worldLevel: 17,
                minHp: 940,
                maxHp: 1035,
                minDamage: 75,
                maxDamage: 95,
            },
            {
                worldLevel: 18,
                minHp: 1035,
                maxHp: 1130,
                minDamage: 95,
                maxDamage: 105,
            },
            {
                worldLevel: 19,
                minHp: 1130,
                maxHp: 1220,
                minDamage: 105,
                maxDamage: 125,
            },
            {
                worldLevel: 20,
                minHp: 1280,
                maxHp: 1605,
                minDamage: 107,
                maxDamage: 150,
            },
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
