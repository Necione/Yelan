import { get } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { Mutex, withTimeout } from "async-mutex";
import { prisma } from "../prisma";
const mutex = withTimeout(new Mutex(), get.mins(1));

const MACHINES = {
    slots: "slots",
};

const defaultGamblingMachines: Prisma.GamblingMachineCreateInput[] = [
    {
        name: MACHINES.slots,
        prizePool: 0,
    },
];

export async function initializeGamblingMachines() {
    for (const { name, prizePool } of defaultGamblingMachines) {
        await prisma.gamblingMachine.upsert({
            where: { name },
            create: { name, prizePool },
            update: {},
        });
    }
}

export async function getSlots() {
    return await prisma.gamblingMachine.upsert({
        where: {
            name: MACHINES.slots,
        },
        update: {},
        create: { prizePool: 0, name: MACHINES.slots },
    });
}

export async function addSlotsPrizePool(amount: number) {
    await mutex.runExclusive(async () => {
        await prisma.gamblingMachine.update({
            where: {
                name: MACHINES.slots,
            },
            data: {
                prizePool: {
                    increment: amount,
                },
            },
        });
    });
}
export async function clearSlotsPrizePool(
    lastClaimedUserId: string | undefined = undefined,
) {
    await mutex.runExclusive(async () => {
        await prisma.gamblingMachine.update({
            where: {
                name: MACHINES.slots,
            },
            data: {
                lastClaimedUserId,
                lastClaimedAt: lastClaimedUserId ? new Date() : undefined,
                prizePool: 0,
            },
        });
    });
}
