const treasureHoarderGravedigger = {
    name: "Treasure Hoarder Potioneer",
    group: "Human",
    minHp: 150,
    maxHp: 250,
    minDamage: 15,
    maxDamage: 20,
    minExp: 7,
    maxExp: 13,
    minWorldLevel: 8,
    image: "https://lh.elara.workers.dev/rpg/monsters/treasure_hoarder_potioneer.png",
    critChance: 10,
    critValue: 3,
    defChance: 20,
    defValue: 8,
    drops: [
        {
            item: "Silver Hoarder Insignia",
            minAmount: 1,
            maxAmount: 3,
            chance: 100,
        },
        {
            item: "Golden Raven Insignia",
            minAmount: 1,
            maxAmount: 2,
            chance: 50,
        },
    ],
    locations: [
        "Nantianmen",
        "Luhua Pool",
        "Dunyu Ruins",
        "Jueyun Karst",
        "Lumberpick Valley",
    ],
};

export default treasureHoarderGravedigger;
