export default {
    currentHp: 0,
    name: "Ruin Guard",
    group: "Machine",
    minExp: 15,
    maxExp: 30,
    minWorldLevel: 17,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_guard.png",
    drops: [
        {
            item: "Chaos Core",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
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
    critChance: 0,
    critValue: 0,
    defChance: 0,
    defValue: 0,
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
