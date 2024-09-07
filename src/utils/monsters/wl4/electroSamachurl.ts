const electroSamachurl = {
    name: "Electro Samachurl",
    minHp: 32,
    maxHp: 55,
    minDamage: 8,
    maxDamage: 13,
    minExp: 4,
    maxExp: 8,
    minWorldLevel: 4,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 3, chance: 85 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 2, chance: 35 },
    ],
    locations: ["Luhua Pool", "Jueyun Karst", "Lumberpick Valley"],
};

export default electroSamachurl;
