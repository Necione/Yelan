const treasureHoarderGravedigger = {
    name: "Treasure Hoarder Gravedigger",
    group: "Human",
    minHp: 150,
    maxHp: 250,
    minDamage: 15,
    maxDamage: 20,
    minExp: 7,
    maxExp: 13,
    minWorldLevel: 7,
    image: "https://lh.elara.workers.dev/rpg/monsters/treasure_hoarder_gravedigger.png",
    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 8,
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
        "Lumberpick Valley",
        "Luhua Pool",
        "Tianqiu Valley",
        "Qingxu Pool",
        "Guili Plains",
    ],
};

export default treasureHoarderGravedigger;
