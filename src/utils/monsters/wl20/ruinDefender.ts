import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Ruin Defender",
    group: MonsterGroup.Machine,
    minExp: 25,
    maxExp: 40,
    minWorldLevel: 20,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_defender.png",
    drops: [
        {
            item: "Chaos Gear",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
        {
            item: "Chaos Axis",
            minAmount: 1,
            maxAmount: 1,
            chance: 25,
        },
    ],

    critChance: 10,
    critValue: 2,
    defChance: 100,
    defValue: 0.25,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 20,
                minHp: 2350,
                maxHp: 2660,
                minDamage: 180,
                maxDamage: 200,
            },
            {
                worldLevel: 21,
                minHp: 2500,
                maxHp: 2900,
                minDamage: 190,
                maxDamage: 230,
            },
            {
                worldLevel: 22,
                minHp: 2600,
                maxHp: 3000,
                minDamage: 220,
                maxDamage: 275,
            },
            {
                worldLevel: 23,
                minHp: 2700,
                maxHp: 3100,
                minDamage: 250,
                maxDamage: 350,
            },
            {
                worldLevel: 24,
                minHp: 2800,
                maxHp: 3200,
                minDamage: 340,
                maxDamage: 375,
            },
            {
                worldLevel: 25,
                minHp: 2900,
                maxHp: 3300,
                minDamage: 360,
                maxDamage: 400,
            },
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
