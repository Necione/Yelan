export default {
    name: "Pyro Slime",
    group: "Slime",
    hpConstant: 11.5,
    atkConstant: 2.7,
    baseHp: 17,
    baseAtk: 4,
    minExp: 4,
    maxExp: 8,
    minWorldLevel: 2,
    image: "https://lh.elara.workers.dev/rpg/monsters/pyro_slime.png",
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
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    locations: [
        "Test",
    ],

    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 2,
};
