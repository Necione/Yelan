const eyeOfTheStorm = {
    name: "Eye of the Storm",
    minHp: 500,
    maxHp: 800,
    minDamage: 10,
    maxDamage: 35,
    minExp: 10,
    maxExp: 20,
    minWorldLevel: 1,
    image: "https://lh.elara.workers.dev/rpg/monsters/eye_of_the_storm.png",
    drops: [
        {
            item: "Elemental Core",
            minAmount: 1,
            maxAmount: 5,
            chance: 100,
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

export default eyeOfTheStorm;
