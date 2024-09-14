const stonehideLawachurl = {
    name: "Stonehide Lawachurl",
    group: "Hilichurl",
    minHp: 150,
    maxHp: 200,
    minDamage: 10,
    maxDamage: 15,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 6,
    image: "https://lh.elara.workers.dev/rpg/monsters/stonehide_lawachurl.png",
    drops: [
        { item: "Stained Mask", minAmount: 1, maxAmount: 3, chance: 100 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Heavy Horn", minAmount: 1, maxAmount: 2, chance: 50 },
        { item: "Black Bronze Horn", minAmount: 1, maxAmount: 2, chance: 25 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    locations: ["Lingju Pass", "Dunyu Ruins", "Guili Plains"],
};

export default stonehideLawachurl;
