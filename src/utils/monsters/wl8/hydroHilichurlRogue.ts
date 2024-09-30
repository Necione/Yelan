export default {
    name: "Hydro Hilichurl Rogue",
    group: "Hilichurl",
    hpConstant: 3,
    atkConstant: 3.5,
    baseHp: 300,
    baseAtk: 35,
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
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
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
