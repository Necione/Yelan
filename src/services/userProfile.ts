import { is, sleep } from "@elara-services/utils";
import { Prisma, type UserWallet } from "@prisma/client";
import { prisma } from "../prisma";
import { logs } from "../utils";

// This function is not atomic, be careful when calling
export async function updateUserProfile(
    userId: string,
    profile: Prisma.UserWalletUpdateInput,
): Promise<UserWallet | null> {
    if (is.array(profile.achievements)) {
        profile.achievements = profile.achievements.map((c) => {
            if (c.achieved) {
                c.achieved = new Date(c.achieved);
            }
            return c;
        });
    }
    return new Promise((res) => {
        return prisma.userWallet
            .update({
                where: { userId },
                data: profile,
            })
            .then((data) => res(data))
            .catch(async (e) => {
                if (e instanceof Prisma.PrismaClientKnownRequestError) {
                    if (e.code === "P2034") {
                        await sleep(1000);
                        return res(updateUserProfile(userId, profile));
                    }
                }
                return res(null);
            });
    });
}

export async function addBalance(
    userId: string,
    amount: number,
    addToAdded = true,
    extra?: string,
) {
    const obj: Prisma.UserWalletUpdateInput = {
        balance: {
            increment: amount,
        },
    };
    if (addToAdded === true) {
        obj["balanceAdded"] = {
            increment: amount,
        };
    }
    await updateUserProfile(userId, obj);
    await logs.action(userId, amount, "add", extra);
}

export async function handleBets(
    userId: string,
    amountToAdd: number,
    amountToRemove: number,
    extra?: string,
) {
    await logs.action(userId, amountToAdd, "add", extra);
    return await updateUserProfile(userId, {
        balance: {
            increment: amountToAdd,
        },
        balanceAdded: {
            increment: amountToAdd - amountToRemove,
        },
        balanceRemove: {
            decrement: amountToRemove,
        },
    });
}

export async function removeBalance(
    userId: string,
    amount: number,
    addToRemove = true,
    extra?: string,
) {
    const obj: Prisma.UserWalletUpdateInput = {
        balance: {
            decrement: amount,
        },
    };
    if (addToRemove === true) {
        obj["balanceRemove"] = {
            increment: amount,
        };
    }
    await updateUserProfile(userId, obj);
    await logs.action(userId, amount, "remove", extra);
}

export async function getProfileByUserId(userId: string) {
    return await prisma.userWallet.upsert({
        create: {
            userId,
        },
        update: {},
        where: {
            userId,
        },
    });
}

export async function getAllUserProfiles(
    args: Prisma.UserWalletFindManyArgs = {},
) {
    return await prisma.userWallet.findMany(args);
}
