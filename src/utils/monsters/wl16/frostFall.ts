export default {
    currentHp: 0,
    name: "Frost Fall",
    group: "Abyss",
    minExp: 12,
    maxExp: 28,
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
    locations: [
        "Qingxu Pool",
        "Lingju Pass",
        "Lumberpick Valley",
        "Dunyu Ruins",
        "Nantianmen",
        "Tianqiu Valley",
        "Luhua Pool",
        "Guili Plains",
        "Jueyun Karst",
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
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
