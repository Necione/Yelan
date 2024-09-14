const fatuiHydrogunner = {
    name: "Fatui Hydrogunner",
    group: "Fatui",
    minHp: 100,
    maxHp: 300,
    minDamage: 60,
    maxDamage: 80,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 11,
    image: "https://lh.elara.workers.dev/rpg/monsters/fatui_hydrogunner.png",
    drops: [
        { item: "Recruit's Insignia", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Sergeant's Insignia", minAmount: 1, maxAmount: 2, chance: 25 },
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

    critChance: 50,
    critValue: 2,
    defChance: 90,
    defValue: 100,
};

export default fatuiHydrogunner;
