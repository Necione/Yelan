import { is, log, noop } from "@elara-services/utils";
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
    const alchemyBaseAttack = stats.alchemyProgress * 0.5;
    const finalBaseAttack = calculatedBaseAttack + alchemyBaseAttack;

    const calculatedMaxHP =
        100 + (stats.worldLevel - 1) * 5 + (stats.rebirths || 0) * 50;

    const additionalWeaponAttackPower =
        stats.equippedWeapon && weapons[stats.equippedWeapon as WeaponName]
            ? weapons[stats.equippedWeapon as WeaponName].attackPower || 0
            : 0;

    const additionalWeaponCritChance =
        stats.equippedWeapon && weapons[stats.equippedWeapon as WeaponName]
            ? weapons[stats.equippedWeapon as WeaponName].critChance || 0
            : 0;

    const additionalWeaponCritValue =
        stats.equippedWeapon && weapons[stats.equippedWeapon as WeaponName]
            ? weapons[stats.equippedWeapon as WeaponName].critValue || 0
            : 0;

    const additionalWeaponHP =
        stats.equippedWeapon && weapons[stats.equippedWeapon as WeaponName]
            ? weapons[stats.equippedWeapon as WeaponName].additionalHP || 0
            : 0;

    const additionalArtifactStats = {
        attackPower: 0,
        critChance: 0,
        critValue: 0,
        defChance: 0,
        defValue: 0,
        maxHP: 0,
    };

    if (
        stats.equippedFlower &&
        artifacts[stats.equippedFlower as ArtifactName]
    ) {
        const flower = artifacts[stats.equippedFlower as ArtifactName];
        additionalArtifactStats.attackPower += flower.attackPower || 0;
        additionalArtifactStats.critChance += flower.critChance || 0;
        additionalArtifactStats.critValue += flower.critValue || 0;
        additionalArtifactStats.defChance += flower.defChance || 0;
        additionalArtifactStats.defValue += flower.defValue || 0;
        additionalArtifactStats.maxHP += flower.maxHP || 0;
    }

    if (stats.equippedPlume && artifacts[stats.equippedPlume as ArtifactName]) {
        const plume = artifacts[stats.equippedPlume as ArtifactName];
        additionalArtifactStats.attackPower += plume.attackPower || 0;
        additionalArtifactStats.critChance += plume.critChance || 0;
        additionalArtifactStats.critValue += plume.critValue || 0;
        additionalArtifactStats.defChance += plume.defChance || 0;
        additionalArtifactStats.defValue += plume.defValue || 0;
        additionalArtifactStats.maxHP += plume.maxHP || 0;
    }

    if (stats.equippedSands && artifacts[stats.equippedSands as ArtifactName]) {
        const sands = artifacts[stats.equippedSands as ArtifactName];
        additionalArtifactStats.attackPower += sands.attackPower || 0;
        additionalArtifactStats.critChance += sands.critChance || 0;
        additionalArtifactStats.critValue += sands.critValue || 0;
        additionalArtifactStats.defChance += sands.defChance || 0;
        additionalArtifactStats.defValue += sands.defValue || 0;
        additionalArtifactStats.maxHP += sands.maxHP || 0;
    }

    if (
        stats.equippedGoblet &&
        artifacts[stats.equippedGoblet as ArtifactName]
    ) {
        const goblet = artifacts[stats.equippedGoblet as ArtifactName];
        additionalArtifactStats.attackPower += goblet.attackPower || 0;
        additionalArtifactStats.critChance += goblet.critChance || 0;
        additionalArtifactStats.critValue += goblet.critValue || 0;
        additionalArtifactStats.defChance += goblet.defChance || 0;
        additionalArtifactStats.defValue += goblet.defValue || 0;
        additionalArtifactStats.maxHP += goblet.maxHP || 0;
    }

    if (
        stats.equippedCirclet &&
        artifacts[stats.equippedCirclet as ArtifactName]
    ) {
        const circlet = artifacts[stats.equippedCirclet as ArtifactName];
        additionalArtifactStats.attackPower += circlet.attackPower || 0;
        additionalArtifactStats.critChance += circlet.critChance || 0;
        additionalArtifactStats.critValue += circlet.critValue || 0;
        additionalArtifactStats.defChance += circlet.defChance || 0;
        additionalArtifactStats.defValue += circlet.defValue || 0;
        additionalArtifactStats.maxHP += circlet.maxHP || 0;
    }

    let calculatedAttackPower =
        finalBaseAttack +
        additionalWeaponAttackPower +
        additionalArtifactStats.attackPower;

    if (calculatedAttackPower < 0) {
        calculatedAttackPower = 0;
    }

    let calculatedCritChance =
        additionalWeaponCritChance + additionalArtifactStats.critChance;
    if (calculatedCritChance < 0) {
        calculatedCritChance = 0;
    }

    let calculatedCritValue =
        additionalWeaponCritValue + additionalArtifactStats.critValue;
    if (calculatedCritValue < 1) {
        calculatedCritValue = 1;
    }

    let calculatedDefChance = additionalArtifactStats.defChance;
    if (calculatedDefChance < 0) {
        calculatedDefChance = 0;
    }

    let calculatedDefValue = additionalArtifactStats.defValue;
    if (calculatedDefValue < 0) {
        calculatedDefValue = 0;
    }

    const finalMaxHP =
        calculatedMaxHP + additionalArtifactStats.maxHP + additionalWeaponHP;

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
                attackPower: 5,
                baseAttack: 5,
                critChance: 0,
                critValue: 0,
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
        .catch((e) => log(`[DATABASE:updateUserStats:${userId}]: ERROR`, e));
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
