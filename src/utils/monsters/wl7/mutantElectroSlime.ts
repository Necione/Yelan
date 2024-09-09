const mutantElectroSlime = {
    name: "Mutant Electro Slime",
    minHp: 150,
    maxHp: 200,
    minDamage: 10,
    maxDamage: 15,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 7,
    image: "https://lh.elara.workers.dev/rpg/monsters/mutant_electro_slime.png",
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
    defValue: 10,
};

export default mutantElectroSlime;
