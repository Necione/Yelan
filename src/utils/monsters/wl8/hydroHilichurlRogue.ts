const hydroHilichurlRogue = {
    name: "Hydro Hilichurl Rogue",
    group: "Hilichurl",
    minHp: 200,
    maxHp: 400,
    minDamage: 15,
    maxDamage: 25,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 8,
    image: "https://lh.elara.workers.dev/rpg/monsters/hydro_hilichurl_rouge.png",
    drops: [
        {
            item: "A Flower Yet to Bloom",
            minAmount: 1,
            maxAmount: 2,
            chance: 50,
        },
    ],
    locations: [
        "Lumberpick Valley",
        "Jueyun Karst",
        "Guili Plains",
        "Luhua Pool",
        "Qingxu Pool",
    ],

    critChance: 10,
    critValue: 2,
    defChance: 75,
    defValue: 25,
};

export default hydroHilichurlRogue;
