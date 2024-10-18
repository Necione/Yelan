import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Ruin Destroyer",
    group: MonsterGroup.Machine,
    minExp: 20,
    maxExp: 35,
    minWorldLevel: 19,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_destroyer.png",
    drops: [
        {
            item: "Chaos Device",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
    ],

    critChance: 5,
    critValue: 100,
    defChance: 50,
    defValue: 0.25,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 19,
                minHp: 2180,
                maxHp: 2275,
                minDamage: 5,
                maxDamage: 5,
            },
            {
                worldLevel: 20,
                minHp: 2350,
                maxHp: 2660,
                minDamage: 5,
                maxDamage: 5,
            },
            {
                worldLevel: 21,
                minHp: 2500,
                maxHp: 2900,
                minDamage: 5,
                maxDamage: 5,
            },
            {
                worldLevel: 22,
                minHp: 2600,
                maxHp: 3000,
                minDamage: 5,
                maxDamage: 5,
            },
            {
                worldLevel: 23,
                minHp: 2700,
                maxHp: 3100,
                minDamage: 5,
                maxDamage: 5,
            },
            {
                worldLevel: 24,
                minHp: 2800,
                maxHp: 3200,
                minDamage: 5,
                maxDamage: 5,
            },
            {
                worldLevel: 25,
                minHp: 2900,
                maxHp: 3300,
                minDamage: 5,
                maxDamage: 5,
            },
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
