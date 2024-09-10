const geoSamachurl = {
    name: "Geo Samachurl",
    group: "Hilichurl",
    minHp: 300,
    maxHp: 400,
    minDamage: 30,
    maxDamage: 40,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 9,
    image: "https://lh.elara.workers.dev/rpg/monsters/geo_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 3, chance: 100 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 2, chance: 75 },
        {
            item: "Forbidden Curse Scroll",
            minAmount: 1,
            maxAmount: 2,
            chance: 50,
        },
    ],
    locations: ["Luhua Pool", "Jueyun Karst", "Lumberpick Valley"],

    critChance: 10,
    critValue: 1.5,
    defChance: 100,
    defValue: 20,
};

export default geoSamachurl;
