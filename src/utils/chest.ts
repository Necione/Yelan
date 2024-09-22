import { getRandomValue } from "./hunt";
import { type ArtifactName, artifacts } from "./rpgitems/artifacts";
import { type DropName, drops } from "./rpgitems/drops";
import { type WeaponName, weapons } from "./rpgitems/weapons";

type LootItem = {
    name: DropName | WeaponName | ArtifactName;
    minAmount: number;
    maxAmount: number;
    minWorldLevel: number;
    chestChance: number;
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
    ...Object.keys(drops).map((drop) => ({
        name: drop as DropName,
        minAmount: drops[drop as DropName].minAmount || 1,
        maxAmount: drops[drop as DropName].maxAmount || 1,
        minWorldLevel: drops[drop as DropName].minWorldLevel,
        chestChance: drops[drop as DropName].chestChance,
    })),
    ...Object.keys(weapons).map((weapon) => ({
        name: weapon as WeaponName,
        minAmount: 1,
        maxAmount: 1,
        minWorldLevel: weapons[weapon as WeaponName].minWorldLevel,
        chestChance: weapons[weapon as WeaponName].chestChance,
    })),
    ...Object.keys(artifacts).map((artifact) => ({
        name: artifact as ArtifactName,
        minAmount: 1,
        maxAmount: 1,
        minWorldLevel: artifacts[artifact as ArtifactName].minWorldLevel,
        chestChance: artifacts[artifact as ArtifactName].chestChance,
    })),
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

    const maxUniqueItems = Math.min(
        2 + rarities.findIndex((r) => r.rarity === selectedRarity.rarity),
        5,
    );

    const loot: {
        item: DropName | WeaponName | ArtifactName;
        amount: number;
    }[] = [];

    let totalUniqueItems = 0;

    const eligibleLoot = chestLoot.filter(
        (lootItem) => worldLevel >= lootItem.minWorldLevel,
    );

    const totalWeight = eligibleLoot.reduce(
        (acc, lootItem) => acc + lootItem.minWorldLevel,
        0,
    );

    while (totalUniqueItems < maxUniqueItems && eligibleLoot.length > 0) {
        let randomWeight = Math.random() * totalWeight;

        for (const lootItem of eligibleLoot) {
            if (randomWeight < lootItem.minWorldLevel) {
                const chance = Math.random() * 100;
                if (chance <= lootItem.chestChance) {
                    const amount = getRandomValue(
                        lootItem.minAmount,
                        lootItem.maxAmount,
                    );

                    if (amount > 0) {
                        loot.push({
                            item: lootItem.name,
                            amount: Math.floor(amount),
                        });
                        totalUniqueItems++;

                        eligibleLoot.splice(eligibleLoot.indexOf(lootItem), 1);
                    }
                }
                break;
            }
            randomWeight -= lootItem.minWorldLevel;
        }
    }

    const coins = getRandomValue(2, 4) * selectedRarity.multiplier;

    return {
        rarity: selectedRarity.rarity,
        loot,
        coins,
    };
}
