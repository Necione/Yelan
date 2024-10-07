import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Fathomless Flames",
    group: MonsterGroup.Abyss,
    minExp: 15,
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
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
