export default {
    name: "Ruin Guard",
    group: "Chasm",
    minHp: 100,
    maxHp: 150,
    minDamage: 40,
    maxDamage: 60,
    minExp: 1,
    maxExp: 2,
    minWorldLevel: 1,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_guard.png",
    drops: [
        {
            item: "Metal Scrap",
            minAmount: 1,
            maxAmount: 2,
            chance: 100,
        },
        {
            item: "Chaos Device",
            minAmount: 1,
            maxAmount: 1,
            chance: 25,
        },
    ],
    locations: ["Cinnabar Cliff", "Glaze Peak", "Tiangong Gorge"],

    critChance: 10,
    critValue: 1.2,
    defChance: 25,
    defValue: 50,
};
