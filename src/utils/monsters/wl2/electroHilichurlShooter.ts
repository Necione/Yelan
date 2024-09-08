const electroHilichurlShooter = {
    name: "Electro Hilichurl Shooter",
    minHp: 20,
    maxHp: 25,
    minDamage: 4,
    maxDamage: 7,
    minExp: 4,
    maxExp: 8,
    minWorldLevel: 2,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_hilichurl_shooter.png",
    drops: [
        {
            item: "Firm Arrowhead",
            minAmount: 1,
            maxAmount: 2,
            chance: 100,
        },
        {
            item: "Sharp Arrowhead",
            minAmount: 1,
            maxAmount: 2,
            chance: 50,
        },
    ],
    locations: ["Tianqiu Valley", "Lumberpick Valley", "Dunyu Ruins"],

    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 2,
};

export default electroHilichurlShooter;
