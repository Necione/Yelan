const treasureHoarderMarksman = {
    name: "Treasure Hoarder Marksman",
    group: "Human",
    minHp: 85,
    maxHp: 130,
    minDamage: 12,
    maxDamage: 28,
    minExp: 7,
    maxExp: 13,
    minWorldLevel: 7,
    image: "https://lh.elara.workers.dev/rpg/monsters/treasure_hoarder_marksman.png",
    critChance: 15,
    critValue: 1.25,
    defChance: 10,
    defValue: 5,
    drops: [
        {
            item: "Treasure Hoarder Insignia",
            minAmount: 1,
            maxAmount: 3,
            chance: 100,
        },
        {
            item: "Silver Raven Insignia",
            minAmount: 1,
            maxAmount: 2,
            chance: 50,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    locations: [
        "Jueyun Karst",
        "Qingxu Pool",
        "Nantianmen",
        "Luhua Pool",
        "Guili Plains",
    ],
};

export default treasureHoarderMarksman;
