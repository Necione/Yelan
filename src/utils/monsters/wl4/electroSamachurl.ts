export default {
    name: "Electro Samachurl",
    group: "Hilichurl",
    hpConstant: 16,
    atkConstant: 3.3,
    baseHp: 50,
    baseAtk: 11,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 4,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 3, chance: 85 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 2, chance: 35 },
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
    defChance: 20,
    defValue: 6,
};
