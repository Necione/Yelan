import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export async function getBotFromId(clientId: string) {
    return await prisma.bot
        .upsert({
            where: { clientId },
            create: { clientId },
            update: {},
        })
        .catch(() => null);
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
        .catch(() => null);
}
