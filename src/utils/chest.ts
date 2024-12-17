import { randomNumber } from "@elara-services/packages";
import { getRandomValue, make } from "@elara-services/utils";
import { type ArtifactName, artifacts } from "./rpgitems/artifacts";
import { type DropName, drops } from "./rpgitems/drops";
import { type MiscName, misc } from "./rpgitems/misc";
import { type WeaponName, weapons } from "./rpgitems/weapons";

type LootItem = {
    name: DropName | WeaponName | ArtifactName;
    minAmount: number;
    maxAmount: number;
    minadventurerank: number;
    chestChance: number;
};

type ChestRarity = {
    rarity: string;
    weight: number;
};

const rarities = make.array<ChestRarity>([
    { rarity: "Common", weight: 26 },
    { rarity: "Exquisite", weight: 51 }, // Yes this is intentional
    { rarity: "Precious", weight: 13 },
    { rarity: "Luxurious", weight: 7 },
    { rarity: "Remarkable", weight: 3 },
]);

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

function getMaxItemsByRarity(rarity: string) {
    switch (rarity) {
        case "Common":
            return 1;
        case "Exquisite":
            return 2;
        case "Precious":
            return 3;
        case "Luxurious":
            return 4;
        case "Remarkable":
            return 5;
        default:
            return 1;
    }
}

const chestLoot = make.array<LootItem>([
    ...Object.keys(drops).map((drop) => ({
        name: drop as DropName,
        minAmount: drops[drop as DropName].minAmount || 1,
        maxAmount: drops[drop as DropName].maxAmount || 1,
        minadventurerank: drops[drop as DropName].minadventurerank,
        chestChance: drops[drop as DropName].chestChance,
    })),
    ...Object.keys(weapons).map((weapon) => ({
        name: weapon as WeaponName,
        minAmount: 1,
        maxAmount: 1,
        minadventurerank: weapons[weapon as WeaponName].minadventurerank,
        chestChance: weapons[weapon as WeaponName].chestChance,
    })),
    ...Object.keys(artifacts).map((artifact) => ({
        name: artifact as ArtifactName,
        minAmount: 1,
        maxAmount: 1,
        minadventurerank: artifacts[artifact as ArtifactName].minadventurerank,
        chestChance: artifacts[artifact as ArtifactName].chestChance,
    })),
]);

function isWeapon(name: string) {
    return name in weapons;
}

export function generateChestLoot(
    adventureRank: number,
    maxUniqueItemsOverride?: number,
) {
    const selectedRarity = selectChestRarity();

    const rarityMaxItems = getMaxItemsByRarity(selectedRarity.rarity);
    const maxUniqueItems = maxUniqueItemsOverride ?? rarityMaxItems;

    const loot = make.array<{
        item: DropName | WeaponName | ArtifactName;
        amount: number;
    }>();

    let hasWeapon = false;

    const eligibleLoot = chestLoot.filter(
        (lootItem) => adventureRank >= lootItem.minadventurerank,
    );

    for (let count = 0; count < maxUniqueItems; count++) {
        if (eligibleLoot.length === 0) {
            break;
        }

        const randomIndex = Math.floor(Math.random() * eligibleLoot.length);
        const lootItem = eligibleLoot[randomIndex];

        if (isWeapon(lootItem.name as string) && hasWeapon) {
            eligibleLoot.splice(randomIndex, 1);
            count--;
            continue;
        }

        const chance = Math.random() * 100;
        if (chance > lootItem.chestChance) {
            eligibleLoot.splice(randomIndex, 1);
            count--;
            continue;
        }

        let quantity = 1;
        if (
            !isWeapon(lootItem.name as string) &&
            !(lootItem.name in artifacts)
        ) {
            quantity = getWeightedQuantity();
        }

        if (isWeapon(lootItem.name as string)) {
            hasWeapon = true;
        }

        loot.push({
            item: lootItem.name,
            amount: quantity,
        });

        eligibleLoot.splice(randomIndex, 1);
    }

    return {
        rarity: selectedRarity.rarity,
        loot,
    };
}

type MaterialItem = {
    name: MiscName;
    minAmount: number;
    maxAmount: number;
    dropChance: number;
};

const materialLoot = make.array<MaterialItem>([
    ...Object.keys(misc).map((item) => ({
        name: item as MiscName,
        minAmount: misc[item as MiscName].minAmount || 1,
        maxAmount: misc[item as MiscName].maxAmount || 1,
        dropChance: misc[item as MiscName].dropChance || 100,
    })),
]);

export function generateRawMaterials() {
    const uniqueMaterialsCount = getRandomValue(2, 3);
    const materials = make.array<{ item: MiscName; amount: number }>();

    const availableLoot = [...materialLoot];

    for (let i = 0; i < uniqueMaterialsCount && availableLoot.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableLoot.length);
        const material = availableLoot[randomIndex];

        const amount = getRandomValue(material.minAmount, material.maxAmount);

        if (amount > 0) {
            materials.push({
                item: material.name,
                amount: Math.floor(amount),
            });

            availableLoot.splice(randomIndex, 1);
        }
    }

    return { materials };
}

type RandomDrop = {
    name: DropName;
    quantity: number;
};

export function getRandomDrop(): RandomDrop {
    const dropNames = Object.keys(drops) as DropName[];
    return {
        name: dropNames[
            randomNumber({ min: 0, max: dropNames.length - 1, integer: true })
        ],
        quantity: randomNumber({ min: 2, max: 6, integer: true }),
    };
}

function getWeightedQuantity() {
    const weights = [
        { quantity: 1, weight: 40 },
        { quantity: 2, weight: 30 },
        { quantity: 3, weight: 15 },
        { quantity: 4, weight: 10 },
        { quantity: 5, weight: 5 },
    ];

    const randomVal = Math.random();
    let cumulative = 0;

    for (const entry of weights) {
        cumulative += entry.weight;
        if (randomVal <= cumulative) {
            return entry.quantity;
        }
    }

    return 1;
}
