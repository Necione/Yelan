import { is, log } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { weapons, type WeaponName } from "../utils/rpgitems/weapons";

export async function syncStats(userId: string) {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }

    // Calculate the correct baseAttack and maxHP based on the user's world level
    const calculatedBaseAttack = 5 + (stats.worldLevel - 1) * 0.5;
    const calculatedMaxHP = 100 + (stats.worldLevel - 1) * 5;

    // Calculate the correct attackPower based on baseAttack and equipped weapon
    const additionalAttackPower = stats.equippedWeapon
        ? weapons[stats.equippedWeapon as WeaponName]?.attackPower || 0
        : 0;
    const calculatedAttackPower = calculatedBaseAttack + additionalAttackPower;

    // Check if baseAttack, attackPower, or maxHP need updating
    let needsUpdate = false;
    if (stats.baseAttack !== calculatedBaseAttack) {
        stats.baseAttack = calculatedBaseAttack;
        needsUpdate = true;
    }
    if (stats.attackPower !== calculatedAttackPower) {
        stats.attackPower = calculatedAttackPower;
        needsUpdate = true;
    }
    if (stats.maxHP !== calculatedMaxHP) {
        stats.maxHP = calculatedMaxHP;
        needsUpdate = true;
    }

    // The actual syncing part owo
    if (needsUpdate) {
        await updateUserStats(userId, {
            baseAttack: { set: calculatedBaseAttack },
            attackPower: { set: calculatedAttackPower },
            maxHP: { set: calculatedMaxHP },
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
                inventory: [],
                exp: 0,
                worldLevel: 1,
            },
            update: {},
        })
        .catch(() => null);
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
