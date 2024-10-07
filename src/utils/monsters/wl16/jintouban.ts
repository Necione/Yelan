export default {
    currentHp: 0,
    name: "Nobushi: Jintouban",
    group: "Human",
    minExp: 10,
    maxExp: 20,
    minWorldLevel: 16,
    image: "https://lh.elara.workers.dev/rpg/monsters/jintouban.png",
    critChance: 25,
    critValue: 7.5,
    defChance: 50,
    defValue: 0.5,
    drops: [
        {
            item: "Old Handguard",
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
    ],
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
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
