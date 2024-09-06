export const monsters = [
    {
        name: "Hilichurl",
        minHp: 20,
        maxHp: 25,
        minDamage: 2,
        maxDamage: 3,
        minExp: 5,
        maxExp: 10,
        minWorldLevel: 1,
        image: "https://lh.elara.workers.dev/rpg/monsters/hilichurl.png",
        drops: [
            { item: "Damaged Mask", minAmount: 1, maxAmount: 2, chance: 100 },
            { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 50 },
        ],
        locations: ["Qingxu Pool", "Lingju Pass", "Tianqiu Valley"],
    },
    {
        name: "Anemo Slime",
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
    },
    {
        name: "Cryo Slime",
        minHp: 12,
        maxHp: 18,
        minDamage: 2,
        maxDamage: 4,
        minExp: 3,
        maxExp: 6,
        minWorldLevel: 1,
        image: "https://lh.elara.workers.dev/rpg/monsters/cryo_slime.png",
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
    },
    {
        name: "Pyro Slime",
        minHp: 14,
        maxHp: 20,
        minDamage: 3,
        maxDamage: 5,
        minExp: 3,
        maxExp: 6,
        minWorldLevel: 1,
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
    },
    {
        name: "Electro Slime",
        minHp: 15,
        maxHp: 22,
        minDamage: 3,
        maxDamage: 4,
        minExp: 3,
        maxExp: 6,
        minWorldLevel: 1,
        image: "https://lh.elara.workers.dev/rpg/monsters/electro_slime.png",
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
    },
    {
        name: "Electro Hilichurl Shooter",
        minHp: 20,
        maxHp: 25,
        minDamage: 4,
        maxDamage: 7,
        minExp: 4,
        maxExp: 7,
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
    },
    {
        name: "Pyro Hilichurl Berserker",
        minHp: 20,
        maxHp: 25,
        minDamage: 4,
        maxDamage: 7,
        minExp: 4,
        maxExp: 7,
        minWorldLevel: 2,
        image: "https://lh.elara.workers.dev/rpg/monsters/pyro_hilichurl_berserker.png",
        drops: [
            { item: "Damaged Mask", minAmount: 1, maxAmount: 2, chance: 100 },
            { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 75 },
            { item: "Ominous Mask", minAmount: 1, maxAmount: 1, chance: 25 },
        ],
        locations: ["Lingju Pass", "Jueyun Karst", "Luhua Pool"],
    },
    {
        name: "Mitachurl",
        minHp: 30,
        maxHp: 50,
        minDamage: 6,
        maxDamage: 10,
        minExp: 4,
        maxExp: 7,
        minWorldLevel: 3,
        image: "https://lh.elara.workers.dev/rpg/monsters/mitachurl.png",
        drops: [
            { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 100 },
            { item: "Ominous Mask", minAmount: 1, maxAmount: 1, chance: 50 },
        ],
        locations: ["Dunyu Ruins", "Luhua Pool", "Guili Plains"],
    },
    {
        name: "Anemo Samachurl",
        minHp: 22,
        maxHp: 45,
        minDamage: 7,
        maxDamage: 11,
        minExp: 5,
        maxExp: 8,
        minWorldLevel: 3,
        image: "https://lh.elara.workers.dev/rpg/monsters/anemo_samachurl.png",
        drops: [
            { item: "Divining Scroll", minAmount: 1, maxAmount: 3, chance: 85 },
            { item: "Sealed Scroll", minAmount: 1, maxAmount: 2, chance: 35 },
        ],
        locations: ["Lumberpick Valley", "Nantianmen", "Jueyun Karst"],
    },
    {
        name: "Cryo Samachurl",
        minHp: 28,
        maxHp: 48,
        minDamage: 5,
        maxDamage: 9,
        minExp: 3,
        maxExp: 6,
        minWorldLevel: 3,
        image: "https://lh.elara.workers.dev/rpg/monsters/cryo_samachurl.png",
        drops: [
            { item: "Divining Scroll", minAmount: 1, maxAmount: 2, chance: 80 },
            { item: "Sealed Scroll", minAmount: 1, maxAmount: 1, chance: 45 },
        ],
        locations: ["Tianqiu Valley", "Jueyun Karst", "Guili Plains"],
    },
    {
        name: "Dendro Slime",
        minHp: 45,
        maxHp: 60,
        minDamage: 8,
        maxDamage: 12,
        minExp: 7,
        maxExp: 10,
        minWorldLevel: 4,
        image: "https://lh.elara.workers.dev/rpg/monsters/dendro_slime.png",
        drops: [
            {
                item: "Slime Secretions",
                minAmount: 1,
                maxAmount: 3,
                chance: 100,
            },
            {
                item: "Slime Concentrate",
                minAmount: 1,
                maxAmount: 2,
                chance: 75,
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
    },
    {
        name: "Large Cryo Slime",
        minHp: 50,
        maxHp: 65,
        minDamage: 9,
        maxDamage: 13,
        minExp: 8,
        maxExp: 12,
        minWorldLevel: 4,
        image: "https://lh.elara.workers.dev/rpg/monsters/large_cryo_slime.png",
        drops: [
            {
                item: "Slime Secretions",
                minAmount: 2,
                maxAmount: 4,
                chance: 100,
            },
            {
                item: "Slime Concentrate",
                minAmount: 1,
                maxAmount: 1,
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
    },
];

export function getRandomValue(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateDrop(
    drops: {
        item: string;
        minAmount: number;
        maxAmount: number;
        chance: number;
    }[],
): { item: string; amount: number }[] {
    const droppedItems: { item: string; amount: number }[] = [];

    drops.forEach((drop) => {
        if (Math.random() * 100 < drop.chance) {
            const amount = getRandomValue(drop.minAmount, drop.maxAmount);
            droppedItems.push({ item: drop.item, amount });
        }
    });

    return droppedItems;
}

export function calculateExp(minExp: number, maxExp: number): number {
    return getRandomValue(minExp, maxExp);
}

export function getRandomMonster(worldLevel: number, location: string) {
    const availableMonsters = monsters.filter(
        (monster) =>
            worldLevel >= (monster.minWorldLevel || 1) &&
            monster.locations.includes(location),
    );

    if (availableMonsters.length === 0) {
        return null;
    }

    const weightedMonsters = availableMonsters.flatMap((monster) => {
        const weight = Math.pow(2, monster.minWorldLevel - worldLevel);
        return Array(Math.max(1, weight)).fill(monster);
    });

    return weightedMonsters[
        Math.floor(Math.random() * weightedMonsters.length)
    ];
}

export function getEncounterDescription(monsterName: string, location: string) {
    const encounterDescriptions = [
        `You were travelling around ${location} when a ${monsterName} attacked you!`,
        `As you explored the ancient ruins near ${location}, a ${monsterName} suddenly appeared!`,
        `While gathering herbs in ${location}, a ${monsterName} jumped out from the bushes!`,
        `You were admiring the scenery at ${location} when a ${monsterName} confronted you!`,
        `As you crossed the bridges of ${location}, a ${monsterName} blocked your path!`,
        `Wandering through the mist at ${location}, you were ambushed by a ${monsterName}!`,
        `In the depths of ${location}, a ${monsterName} loomed in the shadows and charged at you!`,
    ];

    return encounterDescriptions[
        Math.floor(Math.random() * encounterDescriptions.length)
    ];
}
