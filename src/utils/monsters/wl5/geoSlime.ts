const geoSlime = {
    name: "Geo Slime",
    minHp: 75,
    maxHp: 100,
    minDamage: 1,
    maxDamage: 15,
    minExp: 3,
    maxExp: 8,
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
};

export default geoSlime;
