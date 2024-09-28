export default {
    name: "Ruin Scout",
    group: "Chasm",
    minHp: 200,
    maxHp: 300,
    minDamage: 40,
    maxDamage: 50,
    minExp: 1,
    maxExp: 2,
    minWorldLevel: 1,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_scout.png",
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
            chance: 25,
        },
    ],
    locations: ["Cinnabar Cliff", "Glaze Peak", "Tiangong Gorge"],

    critChance: 25,
    critValue: 2,
    defChance: 25,
    defValue: 50,
};
