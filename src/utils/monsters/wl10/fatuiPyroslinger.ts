const fatuiPyroslinger = {
    name: "Fatui Pyroslinger",
    group: "Fatui",
    minHp: 400,
    maxHp: 500,
    minDamage: 75,
    maxDamage: 100,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 11,
    image: "https://lh.elara.workers.dev/rpg/monsters/fatui_pyroslinger.png",
    drops: [
        { item: "Recruit's Insignia", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Sergeant's Insignia", minAmount: 1, maxAmount: 2, chance: 25 },
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

    critChance: 33,
    critValue: 1.5,
    defChance: 50,
    defValue: 75,
};

export default fatuiPyroslinger;
