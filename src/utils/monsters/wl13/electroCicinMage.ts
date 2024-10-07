export default {
    currentHp: 0,
    name: "Electro Cicin Mage",
    group: "Fatui",
    minExp: 10,
    maxExp: 25,
    minWorldLevel: 13,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_cicin_mage.png",
    drops: [
        {
            item: "Mist Grass Pollen",
            minAmount: 1,
            maxAmount: 2,
            chance: 75,
        },
        {
            item: "Mist Grass",
            minAmount: 1,
            maxAmount: 2,
            chance: 25,
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
    defChance: 90,
    defValue: 0.2,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 13,
                minHp: 415,
                maxHp: 470,
                minDamage: 31,
                maxDamage: 38,
            },
            {
                worldLevel: 14,
                minHp: 470,
                maxHp: 525,
                minDamage: 33,
                maxDamage: 40,
            },
            {
                worldLevel: 15,
                minHp: 525,
                maxHp: 580,
                minDamage: 36,
                maxDamage: 44,
            },
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
