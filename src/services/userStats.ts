import { is, noop } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { artifacts, type ArtifactName } from "../utils/rpgitems/artifacts";
import { weapons, type WeaponName } from "../utils/rpgitems/weapons";

export async function syncStats(userId: string) {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }

    const calculatedBaseAttack = 5 + (stats.worldLevel - 1) * 0.5;
    const alchemyBaseAttack = stats.alchemyProgress * 0.25;
    const finalBaseAttack = calculatedBaseAttack + alchemyBaseAttack;

    const calculatedMaxHP =
        100 + (stats.worldLevel - 1) * 10 + (stats.rebirths || 0) * 50;

    const additionalWeaponStats = {
        attackPower: 0,
        critChance: 0,
        critValue: 0,
        additionalHP: 0,
        defChance: 0,
        defValue: 0,
    };

    if (stats.equippedWeapon && weapons[stats.equippedWeapon as WeaponName]) {
        const weapon = weapons[stats.equippedWeapon as WeaponName];
        additionalWeaponStats.attackPower = weapon.attackPower || 0;
        additionalWeaponStats.critChance = weapon.critChance || 0;
        additionalWeaponStats.critValue = weapon.critValue || 0;
        additionalWeaponStats.additionalHP = weapon.additionalHP || 0;
        additionalWeaponStats.defChance = weapon.defChance || 0;
        additionalWeaponStats.defValue = weapon.defValue || 0;
    }

    const additionalArtifactStats = {
        attackPower: 0,
        critChance: 0,
        critValue: 0,
        defChance: 0,
        defValue: 0,
        maxHP: 0,
    };

    const artifactTypes = [
        "Flower",
        "Plume",
        "Sands",
        "Goblet",
        "Circlet",
    ] as const;

    for (const type of artifactTypes) {
        const field = `equipped${type}` as keyof typeof stats;
        if (stats[field] && artifacts[stats[field] as ArtifactName]) {
            const artifact = artifacts[stats[field] as ArtifactName];
            additionalArtifactStats.attackPower += artifact.attackPower || 0;
            additionalArtifactStats.critChance += artifact.critChance || 0;
            additionalArtifactStats.critValue += artifact.critValue || 0;
            additionalArtifactStats.defChance += artifact.defChance || 0;
            additionalArtifactStats.defValue += artifact.defValue || 0;
            additionalArtifactStats.maxHP += artifact.maxHP || 0;
        }
    }

    let calculatedAttackPower =
        finalBaseAttack +
        additionalWeaponStats.attackPower +
        additionalArtifactStats.attackPower;

    if (calculatedAttackPower < 0) {
        calculatedAttackPower = 0;
    }

    let calculatedCritChance =
        1 +
        additionalWeaponStats.critChance +
        additionalArtifactStats.critChance;
    if (calculatedCritChance < 0) {
        calculatedCritChance = 0;
    }

    const calculatedCritValue =
        1 + additionalWeaponStats.critValue + additionalArtifactStats.critValue;

    let calculatedDefChance =
        additionalWeaponStats.defChance + additionalArtifactStats.defChance;
    if (calculatedDefChance < 0) {
        calculatedDefChance = 0;
    }

    let calculatedDefValue =
        additionalWeaponStats.defValue + additionalArtifactStats.defValue;
    if (calculatedDefValue < 0) {
        calculatedDefValue = 0;
    }

    const finalMaxHP = Math.floor(
        calculatedMaxHP +
            additionalArtifactStats.maxHP +
            additionalWeaponStats.additionalHP,
    );

    let needsUpdate = false;
    if (stats.baseAttack !== finalBaseAttack) {
        stats.baseAttack = finalBaseAttack;
        needsUpdate = true;
    }
    if (stats.attackPower !== calculatedAttackPower) {
        stats.attackPower = calculatedAttackPower;
        needsUpdate = true;
    }
    if (stats.maxHP !== finalMaxHP) {
        stats.maxHP = finalMaxHP;
        needsUpdate = true;
    }
    if (stats.critChance !== calculatedCritChance) {
        stats.critChance = calculatedCritChance;
        needsUpdate = true;
    }
    if (stats.critValue !== calculatedCritValue) {
        stats.critValue = calculatedCritValue;
        needsUpdate = true;
    }
    if (stats.defChance !== calculatedDefChance) {
        stats.defChance = calculatedDefChance;
        needsUpdate = true;
    }
    if (stats.defValue !== calculatedDefValue) {
        stats.defValue = calculatedDefValue;
        needsUpdate = true;
    }

    if (needsUpdate) {
        return await updateUserStats(userId, {
            baseAttack: { set: finalBaseAttack },
            attackPower: { set: calculatedAttackPower },
            maxHP: { set: finalMaxHP },
            critChance: { set: calculatedCritChance },
            critValue: { set: calculatedCritValue },
            defChance: { set: calculatedDefChance },
            defValue: { set: calculatedDefValue },
        });
    }

    return stats;
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
