const dendroSlime = {
    name: "Dendro Slime",
    group: "Slime",
    minHp: 45,
    maxHp: 60,
    minDamage: 8,
    maxDamage: 12,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 4,
    image: "https://lh.elara.workers.dev/rpg/monsters/dendro_slime.png",
    drops: [
        {
            item: "Slime Secretions",
            minAmount: 1,
            maxAmount: 3,
            chance: 100,
        },
        {
            item: "Slime Concentrate",
            minAmount: 1,
            maxAmount: 2,
            chance: 75,
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

export default dendroSlime;
