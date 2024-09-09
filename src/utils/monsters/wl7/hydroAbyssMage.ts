const hydroAbyssMage = {
    name: "Hydro Abyss Mage",
    minHp: 100,
    maxHp: 200,
    minDamage: 10,
    maxDamage: 30,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 7,
    image: "https://lh.elara.workers.dev/rpg/monsters/hydro_abyss_mage.png",
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
    defChance: 90,
    defValue: 50,
};

export default hydroAbyssMage;
