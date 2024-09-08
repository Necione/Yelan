const pyroHilichurlBerserker = {
    name: "Pyro Hilichurl Berserker",
    minHp: 20,
    maxHp: 25,
    minDamage: 5,
    maxDamage: 8,
    minExp: 4,
    maxExp: 8,
    minWorldLevel: 2,
    image: "https://lh.elara.workers.dev/rpg/monsters/pyro_hilichurl_berserker.png",
    drops: [
        { item: "Damaged Mask", minAmount: 1, maxAmount: 2, chance: 100 },
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 1, chance: 25 },
    ],
    locations: ["Lingju Pass", "Jueyun Karst", "Luhua Pool"],
};

export default pyroHilichurlBerserker;
