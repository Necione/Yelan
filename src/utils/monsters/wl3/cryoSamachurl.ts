const cryoSamachurl = {
    name: "Cryo Samachurl",
    minHp: 28,
    maxHp: 48,
    minDamage: 5,
    maxDamage: 9,
    minExp: 7,
    maxExp: 12,
    minWorldLevel: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/cryo_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 2, chance: 80 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 1, chance: 45 },
    ],
    locations: ["Tianqiu Valley", "Jueyun Karst", "Guili Plains"],
};

export default cryoSamachurl;
