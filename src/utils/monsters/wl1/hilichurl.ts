export default {
    name: "Hilichurl",
    group: "Hilichurl",
    hpConstant: 11,
    atkConstant: 2.5,
    baseHp: 22,
    baseAtk: 3,
    minExp: 3,
    maxExp: 6,
    minWorldLevel: 1,
    image: "https://lh.elara.workers.dev/rpg/monsters/hilichurl.png",
    drops: [
        { item: "Damaged Mask", minAmount: 1, maxAmount: 2, chance: 100 },
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 50 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    locations: ["Qingxu Pool", "Lingju Pass", "Tianqiu Valley"],
};
