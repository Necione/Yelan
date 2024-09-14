const treasureHoarderCrusher = {
    name: "Treasure Hoarder Crusher",
    group: "Human",
    minHp: 100,
    maxHp: 150,
    minDamage: 18,
    maxDamage: 35,
    minExp: 7,
    maxExp: 13,
    minWorldLevel: 7,
    image: "https://lh.elara.workers.dev/rpg/monsters/treasure_hoarder_crusher.png",
    critChance: 12,
    critValue: 1.4,
    defChance: 30,
    defValue: 10,
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
        "Tianqiu Valley",
        "Guili Plains",
        "Qingxu Pool",
        "Lumberpick Valley",
        "Nantianmen",
    ],
};

export default treasureHoarderCrusher;
