import { formatNumber, is, sleep, status } from "@elara-services/utils";
import {
    getBalanceLimit,
    getDifference,
    isAtBalanceLimit,
    willBeAtBalanceLimit,
} from "@liyueharbor/econ";
import { Prisma, type UserWallet } from "@prisma/client";
import { prisma } from "../prisma";
import { logs, texts } from "../utils";

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

export async function updateRankedUID(userId: string, uid: number | null) {
    let rankedUID = null;
    let rankedRegion = null;
    if (uid && !isNaN(uid)) {
        rankedUID = uid;
        rankedRegion = parseInt(uid.toString().slice(0, 1));
    }
    await updateUserProfile(userId, {
        rankedUID,
        rankedRegion,
    });
}

export async function addBalance(
    userId: string,
    amount: number,
    addToAdded = true,
    extra?: string,
    checkBalanceLimits = true,
) {
    const res = await getProfileByUserId(userId);
    if (!res) {
        return;
    }
    if (checkBalanceLimits) {
        if (
            isAtBalanceLimit(res.staffCredits, res.balance || 0, res.vault || 0)
        ) {
            return;
        }
        if (
            willBeAtBalanceLimit(
                res.staffCredits,
                res.balance || 0,
                res.vault || 0,
                amount,
            )
        ) {
            const amountTOAdd = getDifference(
                res.staffCredits,
                Math.floor((res.balance || 0) + (res.vault || 0)),
            );
            if (!is.number(amountTOAdd)) {
                return;
            }
            amount = amountTOAdd;
        }
    }
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
    const res = await getProfileByUserId(userId);
    if (!res) {
        return null;
    }
    if (isAtBalanceLimit(res.staffCredits, res.balance || 0, res.vault || 0)) {
        return;
    }
    if (
        willBeAtBalanceLimit(
            res.staffCredits,
            res.balance || 0,
            res.vault || 0,
            amountToAdd,
        )
    ) {
        const amountTOAdd = getDifference(
            res.staffCredits,
            Math.floor((res.balance || 0) + (res.vault || 0)),
        );
        if (!is.number(amountTOAdd)) {
            return;
        }
        amountToAdd = amountTOAdd;
    }
    const obj: Prisma.UserWalletUpdateInput = {
        balance: {
            increment: amountToAdd,
        },
        balanceAdded: {
            increment: amountToAdd - amountToRemove,
        },
        balanceRemove: {
            decrement: amountToRemove,
        },
    };
    await logs.action(userId, amountToAdd, "add", extra);
    return await updateUserProfile(userId, obj);
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

export function checkBalanceForLimit(p: UserWallet, amount?: number) {
    const rep = p.staffCredits || 0;
    const balance = p.balance || 0;
    const vault = p.vault || 0;
    if (isAtBalanceLimit(rep, balance, vault)) {
        return status.error(
            `<@${p.userId}> has hit their maximum balance of \`${formatNumber(
                getBalanceLimit(rep),
            )} Coins\`\nYou can increase this with reputation (see \`/quests\`)`,
        );
    }
    if (is.number(amount)) {
        if (willBeAtBalanceLimit(rep, balance, vault, amount)) {
            return status.error(
                `User <@${p.userId}> can't earn anymore ${texts.c.u} until they get more reputation.`,
            );
        }
    }
    return status.success(`Good to go!`);
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

export async function getPets(userId: string) {
    return await prisma.pets.upsert({
        where: { userId },
        create: { userId },
        update: { userId },
    });
}

export async function updatePets(userId: string, data: Prisma.PetsUpdateInput) {
    return await prisma.pets.update({
        where: { userId },
        data,
    });
}
