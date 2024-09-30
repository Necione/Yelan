export default {
    name: "Anemo Samachurl",
    group: "Hilichurl",
    hpConstant: 14,
    atkConstant: 3,
    baseHp: 33.5,
    baseAtk: 7,
    minExp: 5,
    maxExp: 7,
    minWorldLevel: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/anemo_samachurl.png",
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
    locations: ["Lumberpick Valley", "Nantianmen", "Jueyun Karst"],

    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 4,
};
