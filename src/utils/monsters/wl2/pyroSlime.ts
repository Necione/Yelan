const pyroSlime = {
    name: "Pyro Slime",
    minHp: 14,
    maxHp: 20,
    minDamage: 3,
    maxDamage: 5,
    minExp: 5,
    maxExp: 10,
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

export default pyroSlime;
