const mitachurl = {
    name: "Mitachurl",
    minHp: 30,
    maxHp: 50,
    minDamage: 5,
    maxDamage: 9,
    minExp: 7,
    maxExp: 12,
    minWorldLevel: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/mitachurl.png",
    drops: [
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 100 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 1, chance: 50 },
    ],
    locations: ["Dunyu Ruins", "Luhua Pool", "Guili Plains"],
};

export default mitachurl;
