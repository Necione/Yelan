import { log } from "@elara-services/utils";
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";

export interface Monster {
    currentHp: number;
    name: string;
    group: string;
    minHp: number;
    maxHp: number;
    minDamage: number;
    maxDamage: number;
    minExp: number;
    maxExp: number;
    critChance: number;
    critValue: number;
    defChance: number;
    defValue: number;
    minWorldLevel: number;
    image: string;
    drops: {
        item: string;
        minAmount: number;
        maxAmount: number;
        chance: number;
    }[];
    locations: string[];
}

const monsters: Monster[] = [];
let monstersLoaded = false;

async function loadMonsters(dir: string): Promise<void> {
    const files = readdirSync(dir);

    for (const file of files) {
        const fullPath = join(dir, file);

        if (file === "bosses" && statSync(fullPath).isDirectory()) {
            continue;
        }

        if (statSync(fullPath).isDirectory()) {
            await loadMonsters(fullPath);
        } else if ([".ts", ".js"].some((c) => file.endsWith(c))) {
            try {
                const monster = (await import(fullPath)).default as Monster;
                if (monster && !monsters.some((m) => m.name === monster.name)) {
                    monsters.push(monster);
                }
            } catch (error) {
                log(`Error loading monster from file: ${fullPath}`, error);
            }
        }
    }
}

const monstersDir = resolve(__dirname, "./monsters");

export async function initializeMonsters(): Promise<void> {
    if (!monstersLoaded) {
        await loadMonsters(monstersDir);
        monstersLoaded = true;
        log(`Total monsters loaded: ${monsters.length}`);
    }
}

export { monsters, monstersLoaded };

export function getRandomValue(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateDrop(
    drops: {
        item: string;
        minAmount: number;
        maxAmount: number;
        chance: number;
    }[],
): { item: string; amount: number }[] {
    const droppedItems: { item: string; amount: number }[] = [];

    drops.forEach((drop) => {
        if (Math.random() * 100 < drop.chance) {
            const amount = getRandomValue(drop.minAmount, drop.maxAmount);
            droppedItems.push({ item: drop.item, amount });
        }
    });

    return droppedItems;
}

export function calculateExp(minExp: number, maxExp: number): number {
    return getRandomValue(minExp, maxExp);
}

const lowEncounterAverages = [
    { worldLevel: 1, minHp: 12, maxHp: 20, minDamage: 2, maxDamage: 6 },
    { worldLevel: 2, minHp: 14, maxHp: 25, minDamage: 4, maxDamage: 8 },
    { worldLevel: 3, minHp: 22, maxHp: 50, minDamage: 5, maxDamage: 10 },
    { worldLevel: 4, minHp: 32, maxHp: 65, minDamage: 8, maxDamage: 13 },
    { worldLevel: 5, minHp: 40, maxHp: 100, minDamage: 9, maxDamage: 16 },
    { worldLevel: 6, minHp: 75, maxHp: 200, minDamage: 14, maxDamage: 25 },
    { worldLevel: 7, minHp: 100, maxHp: 250, minDamage: 18, maxDamage: 35 },
    { worldLevel: 8, minHp: 150, maxHp: 450, minDamage: 25, maxDamage: 40 },
    { worldLevel: 9, minHp: 200, maxHp: 600, minDamage: 30, maxDamage: 50 },
    { worldLevel: 10, minHp: 250, maxHp: 600, minDamage: 40, maxDamage: 60 },
    { worldLevel: 11, minHp: 325, maxHp: 700, minDamage: 50, maxDamage: 70 },
    { worldLevel: 12, minHp: 400, maxHp: 800, minDamage: 65, maxDamage: 85 },
    { worldLevel: 13, minHp: 500, maxHp: 900, minDamage: 70, maxDamage: 90 },
    { worldLevel: 14, minHp: 600, maxHp: 1200, minDamage: 80, maxDamage: 95 },
];

export async function getRandomMonster(worldLevel: number, location: string) {
    if (!monstersLoaded) {
        return null;
    }

    const availableMonsters = monsters.filter(
        (monster) =>
            worldLevel >= monster.minWorldLevel &&
            monster.locations.includes(location),
    );

    if (availableMonsters.length === 0) {
        log("No available monsters found for this location and world level.");
        return null;
    }

    const uniqueGroups = [
        ...new Set(availableMonsters.map((monster) => monster.group)),
    ];

    const randomGroup =
        uniqueGroups[Math.floor(Math.random() * uniqueGroups.length)];

    const monstersInGroup = availableMonsters.filter(
        (monster) => monster.group === randomGroup,
    );

    if (monstersInGroup.length === 0) {
        log(`No monsters found for group ${randomGroup} at this world level.`);
        return null;
    }

    const totalWeight = monstersInGroup.reduce(
        (acc, monster) => acc + monster.minWorldLevel,
        0,
    );
    let randomWeight = Math.random() * totalWeight;
    let selectedMonster: Monster | null = null;

    for (const monster of monstersInGroup) {
        randomWeight -= monster.minWorldLevel;
        if (randomWeight <= 0) {
            selectedMonster = monster;
            break;
        }
    }

    if (!selectedMonster) {
        log("No monster selected after applying weights.");
        return null;
    }

    log(
        `Random monster chosen from group ${randomGroup}: ${selectedMonster.name}`,
    );

    if (worldLevel > selectedMonster.minWorldLevel) {
        const encounterAverages = lowEncounterAverages.find(
            (avg) => avg.worldLevel === worldLevel,
        );

        if (encounterAverages) {
            selectedMonster.minHp = encounterAverages.minHp;
            selectedMonster.maxHp = encounterAverages.maxHp;
            selectedMonster.minDamage = encounterAverages.minDamage;
            selectedMonster.maxDamage = encounterAverages.maxDamage;

            log(
                `Stats replaced with low encounter averages for world level ${worldLevel}`,
            );
            log(
                `Min HP: ${selectedMonster.minHp}, Max HP: ${selectedMonster.maxHp}`,
            );
            log(
                `Min Damage: ${selectedMonster.minDamage}, Max Damage: ${selectedMonster.maxDamage}`,
            );
        } else {
            log(
                `No encounter averages found for world level ${worldLevel}. Using monster's base stats.`,
            );
        }
    } else {
        log(`Using monster's base stats for world level ${worldLevel}.`);
    }

    return selectedMonster;
}

export async function getRandomBoss(
    worldLevel: number,
): Promise<Monster | null> {
    const bossDir = resolve(__dirname, "./monsters/bosses");
    const bossFiles = readdirSync(bossDir);

    const bosses: Monster[] = [];
    for (const file of bossFiles) {
        const fullPath = join(bossDir, file);
        if (
            statSync(fullPath).isFile() &&
            (file.endsWith(".ts") || file.endsWith(".js"))
        ) {
            try {
                const boss = (await import(fullPath)).default as Monster;
                if (boss && worldLevel >= boss.minWorldLevel) {
                    bosses.push(boss);
                }
            } catch (error) {
                log(`Error loading boss from file: ${fullPath}`, error);
            }
        }
    }

    if (bosses.length === 0) {
        return null;
    }

    return bosses[Math.floor(Math.random() * bosses.length)];
}

export function getEncounterDescription(monsterName: string, location: string) {
    const encounterDescriptions = [
        `You were travelling around ${location} when a ${monsterName} attacked you!`,
        `As you explored the ancient ruins near ${location}, a ${monsterName} suddenly appeared!`,
        `While gathering herbs in ${location}, a ${monsterName} jumped out from the bushes!`,
        `You were admiring the scenery at ${location} when a ${monsterName} confronted you!`,
        `As you crossed the bridges of ${location}, a ${monsterName} blocked your path!`,
        `Wandering through the mist at ${location}, you were ambushed by a ${monsterName}!`,
        `In the depths of ${location}, a ${monsterName} loomed in the shadows and charged at you!`,
    ];

    return encounterDescriptions[
        Math.floor(Math.random() * encounterDescriptions.length)
    ];
}

export function formatChange(value: number): string {
    if (value < 0) {
        return `-${Math.abs(value).toFixed(2)}`;
    }
    return `+${value.toFixed(2)}`;
}
