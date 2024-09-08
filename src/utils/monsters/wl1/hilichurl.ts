const hilichurl = {
    name: "Hilichurl",
    minHp: 20,
    maxHp: 25,
    minDamage: 2,
    maxDamage: 3,
    minExp: 3,
    maxExp: 6,
    minWorldLevel: 1,
    image: "https://lh.elara.workers.dev/rpg/monsters/hilichurl.png",
    drops: [
        { item: "Damaged Mask", minAmount: 1, maxAmount: 2, chance: 100 },
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 50 },
    ],
    locations: ["Qingxu Pool", "Lingju Pass", "Tianqiu Valley"],
};

export default hilichurl;
