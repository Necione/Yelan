import { get } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
export const boosterExpiryDuration = get.hrs(1);

// There is probably better way to do this, but as of now we assume the first element is the active booster
export async function getActiveCoinBoosters(
    where: Prisma.GlobalBoosterWhereInput = {},
) {
    return await prisma.globalBooster.findMany({
        where: {
            ...where,
            type: "BALANCE",
            expiredAt: {
                gte: new Date(),
            },
        },
        orderBy: { expiredAt: "asc" },
    });
}

export async function addCoinBooster(
    booster: Pick<
        Prisma.GlobalBoosterCreateInput,
        "multiplier" | "purchasedByUserId"
    >,
) {
    let expiredAt = new Date(Date.now() + boosterExpiryDuration);

    const activeCoinBoosters = await getActiveCoinBoosters();

    if (activeCoinBoosters.length >= 1) {
        expiredAt = new Date(
            activeCoinBoosters.slice(-1)[0].expiredAt.getTime() +
                boosterExpiryDuration,
        );
    }

    return await prisma.globalBooster.create({
        data: {
            type: "BALANCE",
            expiredAt,
            multiplier: booster.multiplier,
            purchasedByUserId: booster.purchasedByUserId,
        },
    });
}
