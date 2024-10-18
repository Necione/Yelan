import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Electro Cicin",
    group: MonsterGroup.Abyss,
    minExp: 20,
    maxExp: 35,
    minWorldLevel: 19,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_cicin.png",
    drops: [
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
    defValue: 0.25,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 19,
                minHp: 500,
                maxHp: 600,
                minDamage: 200,
                maxDamage: 240,
            },
            {
                worldLevel: 20,
                minHp: 600,
                maxHp: 800,
                minDamage: 220,
                maxDamage: 260,
            },
            {
                worldLevel: 21,
                minHp: 650,
                maxHp: 850,
                minDamage: 240,
                maxDamage: 280,
            },
            {
                worldLevel: 22,
                minHp: 700,
                maxHp: 900,
                minDamage: 260,
                maxDamage: 300,
            },
            {
                worldLevel: 23,
                minHp: 750,
                maxHp: 950,
                minDamage: 280,
                maxDamage: 320,
            },
            {
                worldLevel: 24,
                minHp: 800,
                maxHp: 1000,
                minDamage: 300,
                maxDamage: 340,
            },
            {
                worldLevel: 25,
                minHp: 850,
                maxHp: 1050,
                minDamage: 320,
                maxDamage: 360,
            },
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
