import { get, noop, status } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { addBalance } from "./userProfile";

export async function updateUserStreak(userId: string) {
    const p = await getDailyCommandByUserId(userId);
    if (!p) {
        return status.error(`Unable to find/create your daily info.`);
    }

    const now = new Date();

    let newStreak = p.dailyStreak;
    let newTotal = p.dailyTotal;

    if (p.lastDateClaim) {
        const timeDiffInHours = getTimeDiffInHours(p.lastDateClaim, now);
        if (timeDiffInHours > 48) {
            newStreak = 1;
            newTotal = 50;
        } else if (timeDiffInHours >= 24) {
            newStreak += 1;
            newTotal = 50 + (newStreak - 1);
        } else {
            return status.error(
                `💫Come back later to claim your daily check-in reward.`,
            );
        }
    } else {
        newStreak = 1;
        newTotal = 50;
    }

    const db = await updateDailyCommand(userId, {
        dailyStreak: { set: newStreak },
        dailyTotal: { set: newTotal },
        lastDateClaim: { set: now },
    });
    if (!db) {
        return status.error(
            `Unknown error while trying to save your daily info.`,
        );
    }

    await addBalance(
        userId,
        50 + (newStreak - 1),
        true,
        `Daily check-in reward`,
    );

    return status.data(db);
}

function getTimeDiffInHours(date1: Date, date2: Date) {
    const diffInMs = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffInMs / get.hrs(1));
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
            where: { userId },
            data,
        })
        .catch(noop);
}
