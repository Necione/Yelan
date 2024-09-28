export default {
    name: "Ruin Grader",
    group: "Chasm",
    minHp: 500,
    maxHp: 600,
    minDamage: 70,
    maxDamage: 100,
    minExp: 1,
    maxExp: 2,
    minWorldLevel: 1,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_grader.png",
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
            chance: 75,
        },
        {
            item: "Chaos Circuit",
            minAmount: 1,
            maxAmount: 1,
            chance: 25,
        },
    ],
    locations: ["Glaze Peak", "Tiangong Gorge"],

    critChance: 20,
    critValue: 1.5,
    defChance: 75,
    defValue: 50,
};
