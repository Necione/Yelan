import { prisma } from "../prisma"; // To be fair this code isn't being used anyway since cron is not here
import { domains } from "../utils/domainsHelper";
import { artifacts } from "../utils/rpgitems/artifacts";
import { drops } from "../utils/rpgitems/drops";
import { misc } from "../utils/rpgitems/misc";

function getRandomItems<
    T extends { chestChance?: number; dropChance?: number },
>(
    items: Record<string, T>,
    count: number,
    minAmount: number,
    maxAmount: number,
    minChance: number,
    maxChance: number,
) {
    const availableItems = Object.entries(items).filter(
        ([, item]) => (item.chestChance ?? item.dropChance ?? 0) > 0,
    );
    const selectedItems = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < count; i++) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * availableItems.length);
        } while (usedIndices.has(randomIndex));

        usedIndices.add(randomIndex);
        const [itemName] = availableItems[randomIndex];
        const amount =
            Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
        const chance =
            Math.floor(Math.random() * (maxChance - minChance + 1)) + minChance;

        selectedItems.push({
            item: itemName,
            amount,
            chance,
        });
    }

    return selectedItems;
}

export async function getDailyDomainMonsters(date: string) {
    for (const [domainName, domain] of Object.entries(domains)) {
        const domainMonsters: string[] = [];

        for (let i = 0; i < domain.monsterCount; i++) {
            const randomIndex = Math.floor(
                Math.random() * domain.monsterPool.length,
            );
            const randomMonster = domain.monsterPool[randomIndex];
            domainMonsters.push(randomMonster);
        }

        const randomRewards = [
            ...getRandomItems(drops, 3, 1, 3, 50, 90),
            ...getRandomItems(misc, 2, 1, 3, 50, 90),
            ...getRandomItems(artifacts, 2, 1, 1, 50, 90),
            {
                item: "Life Essence",
                amount: Math.floor(Math.random() * 2) + 1,
                chance: 10,
            },
            ...(domain.reward.extraItems || []),
        ];

        await prisma.dailyDomainMonsters.upsert({
            where: { date_domain: { date, domain: domainName } },
            update: {
                monsters: domainMonsters,
                rewards: randomRewards,
            },
            create: {
                date,
                domain: domainName,
                monsters: domainMonsters,
                rewards: randomRewards,
            },
        });
    }
}

export const domainMonstersCron = {
    name: "domain-monsters",
    cron: "0 0 * * *",
    timezone: "America/Los_Angeles",
    async execute() {
        const now = new Date();
        const pst = new Date(
            now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
        );
        const today = pst.toISOString().split("T")[0];
        await getDailyDomainMonsters(today);
    },
};
