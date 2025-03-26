import { PrismaClient } from "@prisma/client";
import { getDailyDomainMonsters } from "../cron/domainMonsters";

const prisma = new PrismaClient();

export async function getDomainMonstersForDomain(
    domainName: string,
    date: string,
) {
    let dailyMonsters = await prisma.dailyDomainMonsters.findUnique({
        where: { date_domain: { date, domain: domainName } },
    });

    if (!dailyMonsters) {
        await getDailyDomainMonsters(date);

        dailyMonsters = await prisma.dailyDomainMonsters.findUnique({
            where: { date_domain: { date, domain: domainName } },
        });
    }

    if (!dailyMonsters) {
        throw new Error(`Failed to generate monsters for domain ${domainName}`);
    }

    return {
        monsters: dailyMonsters.monsters,
        rewards: dailyMonsters.rewards,
    };
}
