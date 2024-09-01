import { Prisma, type UserStats } from "@prisma/client";
import { prisma } from "../prisma";

export const getUserStats = async (userId: string) => {
    let stats = await prisma.userStats.findUnique({
        where: { userId },
    });

    if (!stats) {
        // Default User Stats
        stats = await prisma.userStats.create({
            data: {
                userId,
                hp: 100,
                attackPower: 5,
                inventory: [],
            },
        });
    }

    return stats;
};

export const updateUserStats = async (
    userId: string,
    data: Partial<UserStats>,
) => {
    if (data.inventory && !Array.isArray(data.inventory)) {
        throw new Error("Inventory must be an array");
    }

    return await prisma.userStats.update({
        where: { userId },
        data: {
            ...data,
            inventory: data.inventory
                ? (data.inventory as Prisma.InputJsonValue)
                : undefined,
        },
    });
};

export const addItemToInventory = async (
    userId: string,
    itemName: string,
    amount: number,
) => {
    const stats = await getUserStats(userId);

    const inventory =
        (stats.inventory as { item: string; amount: number }[]) || [];
    const itemIndex = inventory.findIndex((i) => i.item === itemName);

    if (itemIndex > -1) {
        inventory[itemIndex].amount += amount;
    } else {
        inventory.push({ item: itemName, amount });
    }

    await updateUserStats(userId, { inventory });
};

export const removeItemFromInventory = async (
    userId: string,
    itemName: string,
    amount: number,
) => {
    const stats = await getUserStats(userId);

    const inventory =
        (stats.inventory as { item: string; amount: number }[]) || [];
    const itemIndex = inventory.findIndex((i) => i.item === itemName);

    if (itemIndex > -1 && inventory[itemIndex].amount >= amount) {
        inventory[itemIndex].amount -= amount;
        if (inventory[itemIndex].amount <= 0) {
            inventory.splice(itemIndex, 1);
        }
    }

    await updateUserStats(userId, { inventory });
};
