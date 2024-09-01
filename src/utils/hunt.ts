export const monsters = [
    {
        name: "Hilichurl",
        minHp: 20,
        maxHp: 25,
        minDamage: 2,
        maxDamage: 3,
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
