export default {
    name: "Geo Samachurl",
    group: "Hilichurl",
    hpConstant: 3,
    atkConstant: 3.5,
    baseHp: 300,
    baseAtk: 35,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 9,
    image: "https://lh.elara.workers.dev/rpg/monsters/geo_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 3, chance: 100 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 2, chance: 75 },
        {
            item: "Forbidden Curse Scroll",
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
    locations: ["Luhua Pool", "Jueyun Karst", "Lumberpick Valley"],

    critChance: 10,
    critValue: 1.5,
    defChance: 100,
    defValue: 20,
};
