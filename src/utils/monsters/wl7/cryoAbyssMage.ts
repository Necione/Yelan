const cryoAbyssMage = {
    name: "Cryo Abyss Mage",
    group: "Abyss",
    minHp: 200,
    maxHp: 250,
    minDamage: 10,
    maxDamage: 35,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 7,
    image: "https://lh.elara.workers.dev/rpg/monsters/cryo_abyss_mage.png",
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
    defChance: 30,
    defValue: 30,
};

export default cryoAbyssMage;
