import { is, noop } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type {
    ArtifactSetName,
    ArtifactType,
} from "../utils/rpgitems/artifacts";
import {
    artifacts,
    artifactSets,
    getArtifactSetBonuses,
    type ArtifactName,
} from "../utils/rpgitems/artifacts";
import { weapons, type WeaponName } from "../utils/rpgitems/weapons";

export async function syncStats(userId: string) {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }

    // Base stats calculations
    const calculatedBaseAttack = 5 + (stats.worldLevel - 1) * 0.5;
    const alchemyBaseAttack = stats.alchemyProgress * 0.25;
    const finalBaseAttack = calculatedBaseAttack + alchemyBaseAttack;

    const calculatedMaxHP =
        100 + (stats.worldLevel - 1) * 10 + (stats.rebirths || 0) * 50;

    // Initialize total stats
    const totalStats = {
        attackPower: finalBaseAttack,
        critChance: 1, // Base crit chance
        critValue: 1, // Base crit damage multiplier
        defChance: 0,
        defValue: 0,
        maxHP: calculatedMaxHP,
        healEffectiveness: 0,
    };

    // Add weapon stats
    if (stats.equippedWeapon && weapons[stats.equippedWeapon as WeaponName]) {
        const weapon = weapons[stats.equippedWeapon as WeaponName];
        totalStats.attackPower += weapon.attackPower || 0;
        totalStats.critChance += weapon.critChance || 0;
        totalStats.critValue += weapon.critValue || 0;
        totalStats.defChance += weapon.defChance || 0;
        totalStats.defValue += weapon.defValue || 0;
        totalStats.maxHP += weapon.additionalHP || 0;
        totalStats.healEffectiveness || 0; // Include if weapons can have healEffectiveness
    }

    // Collect equipped artifacts
    const artifactTypes: ArtifactType[] = [
        "Flower",
        "Plume",
        "Sands",
        "Goblet",
        "Circlet",
    ];
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

    // Calculate and apply set bonuses
    const setCounts: { [setName: string]: number } = {};

    for (const artifactName of Object.values(equippedArtifacts)) {
        const artifact = artifacts[artifactName];
        const setName = artifact.artifactSet;
        setCounts[setName] = (setCounts[setName] || 0) + 1;
    }

    for (const [setName, count] of Object.entries(setCounts)) {
        const setBonuses = artifactSets[setName as ArtifactSetName];
        if (setBonuses) {
            // Apply 2-piece bonus
            if (count >= 2) {
                const bonus2pc = setBonuses["2pc"];
                applySetBonuses(totalStats, bonus2pc);
            }
            // Apply 4-piece bonus
            if (count >= 4) {
                const bonus4pc = setBonuses["4pc"];
                applySetBonuses(totalStats, bonus4pc);
            }
        }
    }

    // Ensure stats are within acceptable ranges
    totalStats.attackPower = Math.max(0, totalStats.attackPower);
    totalStats.critChance = Math.max(0, totalStats.critChance);
    totalStats.critValue = Math.max(0, totalStats.critValue);
    totalStats.defChance = Math.max(0, totalStats.defChance);
    totalStats.defValue = Math.max(0, totalStats.defValue);
    totalStats.maxHP = Math.floor(totalStats.maxHP);
    totalStats.healEffectiveness = Math.max(0, totalStats.healEffectiveness);

    // Check if stats have changed
    let needsUpdate = false;

    if (stats.baseAttack !== finalBaseAttack) {
        stats.baseAttack = finalBaseAttack;
        needsUpdate = true;
    }
    if (stats.attackPower !== totalStats.attackPower) {
        stats.attackPower = totalStats.attackPower;
        needsUpdate = true;
    }
    if (stats.maxHP !== totalStats.maxHP) {
        stats.maxHP = totalStats.maxHP;
        needsUpdate = true;
    }
    if (stats.critChance !== totalStats.critChance) {
        stats.critChance = totalStats.critChance;
        needsUpdate = true;
    }
    if (stats.critValue !== totalStats.critValue) {
        stats.critValue = totalStats.critValue;
        needsUpdate = true;
    }
    if (stats.defChance !== totalStats.defChance) {
        stats.defChance = totalStats.defChance;
        needsUpdate = true;
    }
    if (stats.defValue !== totalStats.defValue) {
        stats.defValue = totalStats.defValue;
        needsUpdate = true;
    }
    if (stats.healEffectiveness !== totalStats.healEffectiveness) {
        stats.healEffectiveness = totalStats.healEffectiveness;
        needsUpdate = true;
    }

    if (needsUpdate) {
        return await updateUserStats(userId, {
            baseAttack: { set: finalBaseAttack },
            attackPower: { set: totalStats.attackPower },
            maxHP: { set: totalStats.maxHP },
            critChance: { set: totalStats.critChance },
            critValue: { set: totalStats.critValue },
            defChance: { set: totalStats.defChance },
            defValue: { set: totalStats.defValue },
            healEffectiveness: { set: totalStats.healEffectiveness },
        });
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

export const addItemToInventory = async (
    userId: string,
    items: { item: string; amount: number }[],
) => {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }
    if (!is.array(stats.inventory, false)) {
        stats.inventory = [];
    }

    if (is.array(items)) {
        for (const i of items) {
            const f = stats.inventory.find((c) => c.item === i.item);
            if (f) {
                f.amount = Math.floor(f.amount + i.amount);
            } else {
                stats.inventory.push(i);
            }
        }
    }

    return await updateUserStats(userId, {
        inventory: {
            set: stats.inventory,
        },
    });
};

export const removeItemFromInventory = async (
    userId: string,
    itemName: string,
    amount: number,
) => {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }
    if (!is.array(stats.inventory, false)) {
        stats.inventory = [];
    }
    const item = stats.inventory.find((c) => c.item === itemName);
    if (!item) {
        return null;
    }
    item.amount = Math.floor(item.amount - amount);
    if (item.amount <= 0) {
        stats.inventory = stats.inventory.filter((c) => c.item !== itemName);
    }

    return await updateUserStats(userId, {
        inventory: {
            set: stats.inventory,
        },
    });
};

export function calculateSetBonuses(equippedArtifacts: {
    [slot in ArtifactType]?: ArtifactName;
}): {
    attackPowerPercentage: number;
    critChance: number;
    critValuePercentage: number;
    maxHPPercentage: number;
    defChance: number;
    defValuePercentage: number;
    healEffectiveness: number;
} {
    const bonuses = {
        attackPowerPercentage: 0,
        critChance: 0,
        critValuePercentage: 0,
        maxHPPercentage: 0,
        defChance: 0,
        defValuePercentage: 0,
        healEffectiveness: 0,
    };

    const setCounts: { [setName: string]: number } = {};

    // Count how many artifacts of each set are equipped
    for (const artifactName of Object.values(equippedArtifacts)) {
        const artifact = artifacts[artifactName];
        if (artifact) {
            const setName = artifact.artifactSet;
            setCounts[setName] = (setCounts[setName] || 0) + 1;
        }
    }

    // Apply set bonuses based on counts
    for (const [setName, count] of Object.entries(setCounts)) {
        const setBonuses = getArtifactSetBonuses(setName as ArtifactSetName);
        if (setBonuses) {
            if (count >= 2) {
                const bonus2pc = setBonuses["2pc"];
                for (const [key, value] of Object.entries(bonus2pc)) {
                    bonuses[key as keyof typeof bonuses] += value as number;
                }
            }
            if (count >= 4) {
                const bonus4pc = setBonuses["4pc"];
                for (const [key, value] of Object.entries(bonus4pc)) {
                    bonuses[key as keyof typeof bonuses] += value as number;
                }
            }
        }
    }

    return bonuses;
}
