import { noop } from "@elara-services/utils";
import type { Prisma, UserWallet } from "@prisma/client";
import { prisma } from "../prisma";

export async function getBotFromId(clientId: string) {
    return await prisma.bot
        .upsert({
            where: { clientId },
            create: { clientId },
            update: {},
        })
        .catch(noop);
}

export async function updateBotData(
    clientId: string,
    data: Prisma.botUpdateInput,
) {
    return await prisma.bot
        .update({
            where: { clientId },
            data,
        })
        .catch(noop);
}

export function sortLB(
    unsorted: UserWallet[],
    name: keyof UserWallet,
    id: string,
) {
    return (
        unsorted
            .slice()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => (b[name] || 0) - (a[name] || 0))
            .map((c) => c.userId)
            .indexOf(id) + 1
    );
}

export async function lb(id: string) {
    const unsorted = await prisma.userWallet.findMany();
    return [
        sortLB(unsorted, "balance", id),
        sortLB(unsorted, "messagesSent", id),
        sortLB(unsorted, "staffCredits", id),
        sortLB(unsorted, "lemon", id),
        sortLB(unsorted, "elo", id),
    ];
}

export async function getStore(guildId: string) {
    return await prisma.serverStore
        .upsert({
            where: { guildId },
            create: { guildId },
            update: {},
        })
        .catch(noop);
}

export async function getCollectables(guildId: string) {
    return await prisma.collectables
        .upsert({
            where: { guildId },
            create: { guildId },
            update: {},
        })
        .catch(noop);
}
