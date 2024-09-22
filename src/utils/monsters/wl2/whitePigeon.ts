export default {
    name: "White Pigeon",
    group: "Animal",
    minHp: 20,
    maxHp: 25,
    minDamage: 2,
    maxDamage: 3,
    minExp: 0,
    maxExp: 0,
    minWorldLevel: 2,
    image: "https://lh.elara.workers.dev/rpg/animals/white_pigeon.png",
    drops: [
        { item: "Fowl", minAmount: 1, maxAmount: 3, chance: 100 },
        { item: "Bird Egg", minAmount: 1, maxAmount: 3, chance: 50 },
    ],
    locations: ["Liyue Harbor"],
};
