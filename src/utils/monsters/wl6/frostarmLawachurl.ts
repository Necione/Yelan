const frostarmLawachurl = {
    name: "Frostarm Lawachurl",
    minHp: 75,
    maxHp: 125,
    minDamage: 10,
    maxDamage: 25,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 6,
    image: "https://lh.elara.workers.dev/rpg/monsters/frostarm_lawachurl.png",
    drops: [
        { item: "Stained Mask", minAmount: 1, maxAmount: 3, chance: 100 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Heavy Horn", minAmount: 1, maxAmount: 2, chance: 50 },
        { item: "Black Bronze Horn", minAmount: 1, maxAmount: 2, chance: 25 },
    ],
    locations: ["Tianqiu Valley", "Qingxu Pool", "Lumberpick Valley"],
};

export default frostarmLawachurl;
