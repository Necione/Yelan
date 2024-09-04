import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { addBalance } from "./userProfile";

export async function updateUserStreak(userId: string) {
    const dailyCommand = await getDailyCommandByUserId(userId);
    if (!dailyCommand) {
        return null;
    }

    const now = new Date();
    const lastDateClaim = dailyCommand.lastDateClaim;

    let newStreak = dailyCommand.dailyStreak;
    let newTotal = dailyCommand.dailyTotal;

    if (lastDateClaim && isSameDay(lastDateClaim, now)) {
        // If the user has already claimed their daily reward for the current day, don't increment the streak and total
        return dailyCommand;
    }
    newStreak =
        lastDateClaim && isYesterday(lastDateClaim, now) ? newStreak + 1 : 1;
    if (newStreak === 1) {
        newTotal = 50; // Reset dailyTotal to 50 when the streak is broken
    } else {
        newTotal = newTotal + 50 + (newStreak - 1);
    }

    await addBalance(
        userId,
        50 + (newStreak - 1),
        true,
        `Daily check-in reward`,
    );

    return await updateDailyCommand(userId, {
        dailyStreak: { set: newStreak },
        dailyTotal: { set: newTotal },
        lastDateClaim: { set: now },
    });
}

function isSameDay(date1: Date, date2: Date) {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

function isYesterday(date1: Date, date2: Date) {
    const yesterday = new Date(date2);
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(date1, yesterday);
}

async function getDailyCommandByUserId(userId: string) {
    return await prisma.dailyCommand
        .upsert({
            where: { userId },
            create: {
                userId,
                dailyStreak: 0,
                dailyTotal: 50,
                lastDateClaim: new Date(),
            },
            update: {},
        })
        .catch(() => null);
}

async function updateDailyCommand(
    userId: string,
    data: Prisma.DailyCommandUpdateInput,
) {
    return await prisma.dailyCommand
        .update({
            where: {
                userId,
            },
            data,
        })
        .catch(() => null);
}
