import { getRandomValue } from "./hunt";
import { type DropName } from "./rpgitems/items";
import { type WeaponName } from "./rpgitems/weapons";

type LootItem = {
    name: DropName | WeaponName;
    minAmount: number;
    maxAmount: number;
    minWorldLevel: number;
    dropChance: number;
};

type ChestRarity = {
    rarity: string;
    multiplier: number;
    weight: number;
};

const rarities: ChestRarity[] = [
    { rarity: "Common", multiplier: 1, weight: 50 },
    { rarity: "Exquisite", multiplier: 2, weight: 25 },
    { rarity: "Precious", multiplier: 3, weight: 15 },
    { rarity: "Luxurious", multiplier: 4, weight: 8 },
    { rarity: "Remarkable", multiplier: 5, weight: 2 },
];

const chestLoot: LootItem[] = [
    {
        name: "Damaged Mask",
        minAmount: 1,
        maxAmount: 2,
        minWorldLevel: 1,
        dropChance: 70,
    },
    {
        name: "Dull Blade",
        minAmount: 1,
        maxAmount: 1,
        minWorldLevel: 1,
        dropChance: 30,
    },
];

function selectChestRarity(): ChestRarity {
    const totalWeight = rarities.reduce(
        (acc, rarity) => acc + rarity.weight,
        0,
    );
    let randomWeight = Math.random() * totalWeight;

    for (const rarity of rarities) {
        if (randomWeight < rarity.weight) {
            return rarity;
        }
        randomWeight -= rarity.weight;
    }
    return rarities[0];
}

export function generateChestLoot(worldLevel: number) {
    const selectedRarity = selectChestRarity();
    const loot: { item: DropName | WeaponName; amount: number }[] = [];

    chestLoot.forEach((lootItem) => {
        if (worldLevel >= lootItem.minWorldLevel) {
            const chance = Math.random() * 100;
            if (chance <= lootItem.dropChance) {
                const amount = getRandomValue(
                    lootItem.minAmount,
                    lootItem.maxAmount,
                );
                loot.push({
                    item: lootItem.name,
                    amount: Math.floor(amount),
                });
            }
        }
    });

    const coins = getRandomValue(4, 8) * selectedRarity.multiplier;

    return {
        rarity: selectedRarity.rarity,
        loot,
        coins,
    };
}
