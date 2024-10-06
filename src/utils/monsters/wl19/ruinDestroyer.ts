export default {
    currentHp: 0,
    name: "Ruin Destroyer",
    group: "Machine",
    minExp: 10,
    maxExp: 25,
    minWorldLevel: 19,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_destroyer.png",
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

    critChance: 5,
    critValue: 10,
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
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
