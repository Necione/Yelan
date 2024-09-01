import { is, log } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export const getUserStats = async (userId: string) => {
    return await prisma.userStats
        .upsert({
            where: { userId },
            create: {
                userId,
                hp: 100,
                attackPower: 5,
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
    try {
        const result = await prisma.userStats.update({
            where: { userId },
            data,
        });
        log(`Successfully updated user stats for user ${userId}`, result);
        return result;
    } catch (error) {
        log(`Error updating user stats for user ${userId}: ${error}`);
        throw error;
    }
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
