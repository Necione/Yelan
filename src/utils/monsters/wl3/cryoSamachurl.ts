export default {
    name: "Cryo Samachurl",
    group: "Hilichurl",
    hpConstant: 14,
    atkConstant: 3,
    baseHp: 38,
    baseAtk: 7,
    minExp: 5,
    maxExp: 7,
    minWorldLevel: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/cryo_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 2, chance: 80 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 1, chance: 45 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    locations: ["Tianqiu Valley", "Jueyun Karst", "Guili Plains"],

    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 4,
};
