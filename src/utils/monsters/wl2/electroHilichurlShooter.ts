const electorHilichurlShooter = {
    name: "Electro Hilichurl Shooter",
    minHp: 20,
    maxHp: 25,
    minDamage: 4,
    maxDamage: 7,
    minExp: 5,
    maxExp: 10,
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
};

export default electorHilichurlShooter;
