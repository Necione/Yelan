const anemoSlime = {
    name: "Anemo Slime",
    group: "Silme",
    minHp: 10,
    maxHp: 15,
    minDamage: 2,
    maxDamage: 3,
    minExp: 3,
    maxExp: 6,
    minWorldLevel: 1,
    image: "https://lh.elara.workers.dev/rpg/monsters/anemo_slime.png",
    drops: [
        {
            item: "Slime Condensate",
            minAmount: 1,
            maxAmount: 2,
            chance: 100,
        },
        {
            item: "Slime Secretions",
            minAmount: 1,
            maxAmount: 2,
            chance: 50,
        },
    ],
    locations: [
        "Qingxu Pool",
        "Lingju Pass",
        "Lumberpick Valley",
        "Dunyu Ruins",
        "Nantianmen",
        "Tianqiu Valley",
        "Luhua Pool",
        "Guili Plains",
        "Jueyun Karst",
    ],
};

export default anemoSlime;
