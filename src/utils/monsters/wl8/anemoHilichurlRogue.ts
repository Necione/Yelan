const anemoHilichurlRogue = {
    name: "Anemo Hilichurl Rogue",
    group: "Hilichurl",
    minHp: 200,
    maxHp: 400,
    minDamage: 15,
    maxDamage: 25,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 8,
    image: "https://lh.elara.workers.dev/rpg/mosnters/anemo_hilichurl_rouge.png",
    drops: [
        {
            item: "A Flower Yet to Bloom",
            minAmount: 1,
            maxAmount: 2,
            chance: 50,
        },
    ],
    locations: [
        "Qingxu Pool",
        "Tianqiu Valley",
        "Jueyun Karst",
        "Guili Plains",
        "Lingju Pass",
    ],
    critChance: 10,
    critValue: 2,
    defChance: 75,
    defValue: 25,
};

export default anemoHilichurlRogue;
