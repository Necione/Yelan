const anemoSamachurl = {
    name: "Anemo Samachurl",
    minHp: 22,
    maxHp: 45,
    minDamage: 5,
    maxDamage: 9,
    minExp: 7,
    maxExp: 12,
    minWorldLevel: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/anemo_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 3, chance: 85 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 2, chance: 35 },
    ],
    locations: ["Lumberpick Valley", "Nantianmen", "Jueyun Karst"],
};

export default anemoSamachurl;
