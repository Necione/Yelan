import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Fatui Pyroslinger",
    group: MonsterGroup.Fatui,
    minExp: 10,
    maxExp: 20,
    minWorldLevel: 11,
    image: "https://lh.elara.workers.dev/rpg/monsters/fatui_pyroslinger.png",
    drops: [
        { item: "Recruit's Insignia", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Sergeant's Insignia", minAmount: 1, maxAmount: 2, chance: 25 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 33,
    critValue: 1.5,
    defChance: 50,
    defValue: 0.5,
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
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
