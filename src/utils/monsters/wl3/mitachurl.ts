const mitachurl = {
    name: "Mitachurl",
    minHp: 30,
    maxHp: 50,
    minDamage: 6,
    maxDamage: 10,
    minExp: 5,
    maxExp: 7,
    minWorldLevel: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/mitachurl.png",
    drops: [
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 100 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 1, chance: 50 },
    ],
    locations: ["Dunyu Ruins", "Luhua Pool", "Guili Plains"],

    critChance: 15,
    critValue: 2,
    defChance: 15,
    defValue: 10,
};

export default mitachurl;
