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

export function getRandomMonster(worldLevel: number) {
    const availableMonsters = monsters.filter(
        (monster) => worldLevel >= (monster.minWorldLevel || 1),
    );
    return availableMonsters[
        Math.floor(Math.random() * availableMonsters.length)
    ];
}

export function getLiyueEncounterDescription(monsterName: string) {
    const locations = [
        "Cuijue Slope",
        "Qingce Village",
        "Wuwang Hill",
        "Jueyun Karst",
        "Mt. Aozang",
        "Liyue Harbor",
        "Dihua Marsh",
    ];

    const randomLocation =
        locations[Math.floor(Math.random() * locations.length)];
    const encounterDescriptions = [
        `You were travelling around ${randomLocation} when a ${monsterName} attacked you!`,
        `As you explored the ancient ruins near ${randomLocation}, a ${monsterName} suddenly appeared!`,
        `While gathering herbs in ${randomLocation}, a ${monsterName} jumped out from the bushes!`,
        `You were admiring the scenery at ${randomLocation} when a ${monsterName} confronted you!`,
        `As you crossed the bridges of ${randomLocation}, a ${monsterName} blocked your path!`,
        `Wandering through the mist at ${randomLocation}, you were ambushed by a ${monsterName}!`,
        `In the depths of ${randomLocation}, a ${monsterName} loomed in the shadows and charged at you!`,
    ];

    return encounterDescriptions[
        Math.floor(Math.random() * encounterDescriptions.length)
    ];
}
