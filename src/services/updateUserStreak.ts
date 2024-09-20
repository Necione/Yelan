import { noop, status } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { addBalance } from "./userProfile";

export async function updateUserStreak(userId: string) {
    const dailyCommand = await getDailyCommandByUserId(userId);
    if (!dailyCommand) {
        return status.error("Unable to find/create your daily info.");
    }

    const now = new Date();
    const lastDateClaim = dailyCommand.lastDateClaim;

    let newStreak = dailyCommand.dailyStreak;
    let newTotal = dailyCommand.dailyTotal;

    if (lastDateClaim && isWithin24Hours(lastDateClaim, now)) {
        // If the user has already claimed their daily reward within the last 24 hours, don't increment the streak and total
        return status.error("Come back tomorrow to claim your daily.");
    }

    // Reset the streak if the last claim was not within 24 hours
    newStreak =
        lastDateClaim && isWithin24Hours(lastDateClaim, now)
            ? newStreak + 1
            : 1;
    if (newStreak === 1) {
        newTotal = 50; // Reset dailyTotal to 50 when the streak is broken
    } else {
        newTotal = 50 + (newStreak - 1);
    }

    const db = await updateDailyCommand(userId, {
        dailyStreak: { set: newStreak },
        dailyTotal: { set: newTotal },
        lastDateClaim: { set: now },
    });
    if (!db) {
        return status.error(
            "Unknown error while trying to save your daily info.",
        );
    }

    await addBalance(
        userId,
        50 + (newStreak - 1),
        true,
        "Daily check-in reward",
    );

    return status.data(db);
}

function isWithin24Hours(date1: Date, date2: Date) {
    const diff = date2.getTime() - date1.getTime();
    return diff < 24 * 60 * 60 * 1000;
}

async function getDailyCommandByUserId(userId: string) {
    return await prisma.dailyCommand
        .upsert({
            where: { userId },
            create: {
                userId,
                dailyStreak: 0,
                dailyTotal: 50,
                lastDateClaim: null,
            },
            update: {},
        })
        .catch(noop);
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
        .catch(noop);
}
