const geoSlime = {
    name: "Geo Slime",
    group: "Slime",
    minHp: 75,
    maxHp: 100,
    minDamage: 1,
    maxDamage: 15,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 5,
    image: "https://lh.elara.workers.dev/rpg/monsters/geo_slime.png",
    drops: [
        {
            item: "Slime Condensate",
            minAmount: 1,
            maxAmount: 3,
            chance: 100,
        },
        {
            item: "Slime Secretions",
            minAmount: 1,
            maxAmount: 3,
            chance: 50,
        },
        {
            item: "Slime Concentrate",
            minAmount: 1,
            maxAmount: 2,
            chance: 50,
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

    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 8,
};

export default geoSlime;
