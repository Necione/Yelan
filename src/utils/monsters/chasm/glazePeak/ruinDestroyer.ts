export default {
    name: "Ruin Destroyer",
    group: "Chasm",
    minHp: 200,
    maxHp: 300,
    minDamage: 70,
    maxDamage: 150,
    minExp: 1,
    maxExp: 2,
    minWorldLevel: 1,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_destroyer.png",
    drops: [
        {
            item: "Metal Scrap",
            minAmount: 1,
            maxAmount: 2,
            chance: 100,
        },
        {
            item: "Chaos Gear",
            minAmount: 1,
            maxAmount: 1,
            chance: 75,
        },
        {
            item: "Chaos Axis",
            minAmount: 1,
            maxAmount: 1,
            chance: 25,
        },
    ],
    locations: ["Glaze Peak", "Tiangong Gorge"],

    critChance: 10,
    critValue: 1.5,
    defChance: 25,
    defValue: 50,
};
