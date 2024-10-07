export default {
    currentHp: 0,
    name: "Wicked Torrents",
    group: "Abyss",
    minExp: 10,
    maxExp: 25,
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
        ];

        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
