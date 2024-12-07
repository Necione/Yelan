import { is, make, noop } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { calculateMasteryLevel } from "../../utils/masteryHelper";
import type {
    ArtifactSetName,
    ArtifactType,
} from "../../utils/rpgitems/artifacts";
import {
    artifacts,
    artifactSets,
    type ArtifactName
} from "../../utils/rpgitems/artifacts";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

interface InventoryItem {
    item: string;
    amount: number;
    metadata?: UserStatsMetaData | null;
}

interface UserStatsMetaData {
    length?: number | null;
}

export async function syncStats(userId: string) {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }

    if (stats.totalAssigned > stats.alchemyProgress) {
        stats.totalAssigned = stats.alchemyProgress;
    }

    const calculatedBaseAttack = 5 + (stats.worldLevel - 1) * 0.5;

    const assignedAttackBonus = (stats.assignedAtk || 0) * 0.25;
    const alchemyBaseAttack = calculatedBaseAttack + assignedAttackBonus;

    const calculatedMaxHP =
        100 + (stats.worldLevel - 1) * 10 + (stats.rebirths || 0) * 5;

    const assignedHpBonus = (stats.assignedHp || 0) * 2;
    const finalMaxHP = calculatedMaxHP + assignedHpBonus;

    const assignedCritValueBonus = (stats.assignedCritValue || 0) * 0.01;
    const assignedDefValueBonus = (stats.assignedDefValue || 0) * 1;
    const calculatedBaseMana = 20;

    const totalStats = {
        critChance: 1,
        defChance: 0,
        attackPower: alchemyBaseAttack,
        critValue: 1 + assignedCritValueBonus,
        defValue: assignedDefValueBonus,
        maxHP: finalMaxHP,
        healEffectiveness: 0,
        maxMana: calculatedBaseMana,
    };

    const catalystMasteryPoints = stats.masteryCatalyst || 0;
    const catalystMastery = calculateMasteryLevel(catalystMasteryPoints);
    const catalystManaBonuses: { [level: number]: number } = {
        1: 10,
        3: 30,
    };

    for (let level = 1; level <= catalystMastery.numericLevel; level++) {
        if (catalystManaBonuses[level]) {
            totalStats.maxMana += catalystManaBonuses[level];
        }
    }

    if (stats.equippedWeapon && weapons[stats.equippedWeapon as WeaponName]) {
        const weapon = weapons[stats.equippedWeapon as WeaponName];
        totalStats.attackPower += weapon.attackPower || 0;
        totalStats.critChance += weapon.critChance || 0;
        totalStats.critValue += weapon.critValue || 0;
        totalStats.defChance += weapon.defChance || 0;
        totalStats.defValue += weapon.defValue || 0;
        totalStats.maxHP += weapon.additionalHP || 0;
        totalStats.healEffectiveness || 0;
    }

    const artifactTypes = make.array<ArtifactType>([
        "Flower",
        "Plume",
        "Sands",
        "Goblet",
        "Circlet",
    ]);

    const equippedArtifacts: { [slot in ArtifactType]?: ArtifactName } = {};

    for (const type of artifactTypes) {
        const field = `equipped${type}` as keyof typeof stats;
        if (stats[field] && artifacts[stats[field] as ArtifactName]) {
            const artifactName = stats[field] as ArtifactName;
            equippedArtifacts[type] = artifactName;

            const artifact = artifacts[artifactName];
            totalStats.attackPower += artifact.attackPower || 0;
            totalStats.critChance += artifact.critChance || 0;
            totalStats.critValue += artifact.critValue || 0;
            totalStats.defChance += artifact.defChance || 0;
            totalStats.defValue += artifact.defValue || 0;
            totalStats.maxHP += artifact.maxHP || 0;
            totalStats.healEffectiveness || 0;
        }
    }

    const setCounts: { [setName: string]: number } = {};

    for (const artifactName of Object.values(equippedArtifacts)) {
        const artifact = artifacts[artifactName];
        const setName = artifact.artifactSet;
        setCounts[setName] = (setCounts[setName] || 0) + 1;
    }

    for (const [setName, count] of Object.entries(setCounts)) {
        const setBonuses = artifactSets[setName as ArtifactSetName];
        if (setBonuses) {
            if (count >= 2) {
                const bonus2pc = setBonuses["2pc"];
                applySetBonuses(totalStats, bonus2pc);
            }

            if (count >= 4) {
                const bonus4pc = setBonuses["4pc"];
                applySetBonuses(totalStats, bonus4pc);
            }
        }
    }

    totalStats.attackPower = Math.max(0, totalStats.attackPower);
    totalStats.critChance = Math.max(0, totalStats.critChance);
    totalStats.critValue = Math.max(0, totalStats.critValue);
    totalStats.defChance = Math.max(0, totalStats.defChance);
    totalStats.defValue = Math.max(0, totalStats.defValue);
    totalStats.maxHP = Math.floor(totalStats.maxHP);
    totalStats.healEffectiveness = Math.max(0, totalStats.healEffectiveness);
    totalStats.maxMana = Math.floor(totalStats.maxMana);

    let needsUpdate = false;
    const updateData: Prisma.UserStatsUpdateInput = {};

    if (stats.maxMana !== totalStats.maxMana) {
        updateData.maxMana = { set: totalStats.maxMana };
        needsUpdate = true;
    }
    if (stats.baseAttack !== alchemyBaseAttack) {
        updateData.baseAttack = { set: alchemyBaseAttack };
        needsUpdate = true;
    }
    if (stats.attackPower !== totalStats.attackPower) {
        updateData.attackPower = { set: totalStats.attackPower };
        needsUpdate = true;
    }
    if (stats.maxHP !== totalStats.maxHP) {
        updateData.maxHP = { set: totalStats.maxHP };
        needsUpdate = true;
    }
    if (stats.critChance !== totalStats.critChance) {
        updateData.critChance = { set: totalStats.critChance };
        needsUpdate = true;
    }
    if (stats.critValue !== totalStats.critValue) {
        updateData.critValue = { set: totalStats.critValue };
        needsUpdate = true;
    }
    if (stats.defChance !== totalStats.defChance) {
        updateData.defChance = { set: totalStats.defChance };
        needsUpdate = true;
    }
    if (stats.defValue !== totalStats.defValue) {
        updateData.defValue = { set: totalStats.defValue };
        needsUpdate = true;
    }
    if (stats.healEffectiveness !== totalStats.healEffectiveness) {
        updateData.healEffectiveness = { set: totalStats.healEffectiveness };
        needsUpdate = true;
    }

    if (needsUpdate) {
        return await updateUserStats(userId, updateData);
    }

    return stats;
}

function applySetBonuses(
    totalStats: {
        attackPower: number;
        critChance: number;
        critValue: number;
        defChance: number;
        defValue: number;
        maxHP: number;
        healEffectiveness: number;
    },
    bonuses: { [key: string]: number },
) {
    for (const [key, value] of Object.entries(bonuses)) {
        switch (key) {
            case "attackPowerPercentage":
                totalStats.attackPower += totalStats.attackPower * value;
                break;
            case "critChance":
                totalStats.critChance += value;
                break;
            case "critValuePercentage":
                totalStats.critValue += totalStats.critValue * value;
                break;
            case "maxHPPercentage":
                totalStats.maxHP += totalStats.maxHP * value;
                break;
            case "defChance":
                totalStats.defChance += value;
                break;
            case "defValuePercentage":
                totalStats.defValue += totalStats.defValue * value;
                break;
            case "healEffectiveness":
                totalStats.healEffectiveness +=
                    totalStats.healEffectiveness * value;
                break;
            default:
                break;
        }
    }
}

export const getUserStats = async (userId: string) => {
    return await prisma.userStats
        .upsert({
            where: { userId },
            create: {
                userId,
                hp: 100,
                maxHP: 100,
                baseAttack: 5,
                critChance: 0.01,
                critValue: 1,
                inventory: [],
                exp: 0,
                worldLevel: 1,
                healEffectiveness: 0,
                maxMana: 20,
            },
            update: {},
        })
        .catch(noop);
};

export const updateUserStats = async (
    userId: string,
    data: Prisma.UserStatsUpdateInput,
) => {
    return await prisma.userStats
        .update({
            where: { userId },
            data,
        })
        .catch(noop);
};

function compareMetadata(
    metadataA: UserStatsMetaData | null | undefined,
    metadataB: UserStatsMetaData | null | undefined,
) {
    if (metadataA == null && metadataB == null) {
        return true;
    }
    if (metadataA == null || metadataB == null) {
        return false;
    }
    return metadataA.length === metadataB.length;
}

export const addItemToInventory = async (
    userId: string,
    items: InventoryItem[],
) => {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }

    let inventory = stats.inventory as InventoryItem[];

    if (!is.array(inventory)) {
        inventory = [];
    }

    if (is.array(items)) {
        for (const i of items) {
            const existingItem = inventory.find(
                (c) =>
                    c.item === i.item &&
                    compareMetadata(c.metadata, i.metadata),
            );
            if (existingItem) {
                existingItem.amount = Math.floor(
                    existingItem.amount + i.amount,
                );
            } else {
                inventory.push(i);
            }
        }
    }

    return await updateUserStats(userId, {
        inventory: {
            set: inventory,
        },
    });
};
export const removeItemFromInventory = async (
    userId: string,
    itemName: string,
    amount: number,
    metadata?: UserStatsMetaData | null,
) => {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }

    let inventory = stats.inventory as InventoryItem[];

    if (!is.array(inventory)) {
        inventory = [];
    }

    const itemIndex = inventory.findIndex(
        (c) => c.item === itemName && compareMetadata(c.metadata, metadata),
    );

    if (itemIndex === -1) {
        return null;
    }

    const item = inventory[itemIndex];
    item.amount = Math.floor(item.amount - amount);
    if (item.amount <= 0) {
        inventory.splice(itemIndex, 1);
    } else {
        inventory[itemIndex] = item;
    }

    return await updateUserStats(userId, {
        inventory: {
            set: inventory,
        },
    });
};