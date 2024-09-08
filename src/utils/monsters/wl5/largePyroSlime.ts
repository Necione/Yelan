const largePyroSlime = {
    name: "Large Pyro Slime",
    minHp: 50,
    maxHp: 65,
    minDamage: 9,
    maxDamage: 11,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 5,
    image: "https://lh.elara.workers.dev/rpg/monsters/large_pyro_slime.png",
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

export default largePyroSlime;
