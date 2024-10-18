import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Wicked Torrents",
    group: MonsterGroup.Abyss,
    minExp: 20,
    maxExp: 30,
    minWorldLevel: 16,
    image: "https://lh.elara.workers.dev/rpg/monsters/wicked_torrents.png",
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

    critChance: 50,
    critValue: 2,
    defChance: 25,
    defValue: 0.5,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 16,
                minHp: 885,
                maxHp: 975,
                minDamage: 54,
                maxDamage: 69,
            },
            {
                worldLevel: 17,
                minHp: 970,
                maxHp: 1070,
                minDamage: 69,
                maxDamage: 83,
            },
            {
                worldLevel: 18,
                minHp: 1065,
                maxHp: 1175,
                minDamage: 82,
                maxDamage: 99,
            },
            {
                worldLevel: 19,
                minHp: 1180,
                maxHp: 1275,
                minDamage: 101,
                maxDamage: 132,
            },
            {
                worldLevel: 20,
                minHp: 1350,
                maxHp: 1660,
                minDamage: 114,
                maxDamage: 158,
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
