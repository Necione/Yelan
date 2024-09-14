const pyroSlime = {
    name: "Pyro Slime",
    group: "Slime",
    minHp: 14,
    maxHp: 20,
    minDamage: 3,
    maxDamage: 5,
    minExp: 4,
    maxExp: 8,
    minWorldLevel: 2,
    image: "https://lh.elara.workers.dev/rpg/monsters/pyro_slime.png",
    drops: [
        {
            item: "Slime Condensate",
            minAmount: 1,
            maxAmount: 2,
            chance: 100,
        },
        {
            item: "Slime Secretions",
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
    defValue: 2,
};

export default pyroSlime;
