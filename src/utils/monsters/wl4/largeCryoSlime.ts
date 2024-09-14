const largeCryoSlime = {
    name: "Large Cryo Slime",
    group: "Slime",
    minHp: 50,
    maxHp: 65,
    minDamage: 9,
    maxDamage: 11,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 4,
    image: "https://lh.elara.workers.dev/rpg/monsters/large_cryo_slime.png",
    drops: [
        {
            item: "Slime Secretions",
            minAmount: 2,
            maxAmount: 4,
            chance: 100,
        },
        {
            item: "Slime Concentrate",
            minAmount: 1,
            maxAmount: 1,
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
    defValue: 6,
};

export default largeCryoSlime;
