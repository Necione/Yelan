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

export const monsters: Monster[] = [];
export let monstersLoaded = false;

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
    { worldLevel: 5, minHp: 40, maxHp: 80, minDamage: 9, maxDamage: 16 },
    { worldLevel: 6, minHp: 75, maxHp: 100, minDamage: 14, maxDamage: 20 },
    { worldLevel: 7, minHp: 100, maxHp: 150, minDamage: 18, maxDamage: 25 },
    { worldLevel: 8, minHp: 150, maxHp: 250, minDamage: 25, maxDamage: 33 },
    { worldLevel: 9, minHp: 200, maxHp: 300, minDamage: 30, maxDamage: 37 },
    { worldLevel: 10, minHp: 250, maxHp: 325, minDamage: 35, maxDamage: 40 },
    { worldLevel: 11, minHp: 275, maxHp: 350, minDamage: 40, maxDamage: 50 },
    { worldLevel: 12, minHp: 400, maxHp: 500, minDamage: 65, maxDamage: 70 },
    { worldLevel: 13, minHp: 500, maxHp: 600, minDamage: 70, maxDamage: 80 },
    { worldLevel: 14, minHp: 600, maxHp: 700, minDamage: 75, maxDamage: 85 },
    { worldLevel: 15, minHp: 700, maxHp: 800, minDamage: 80, maxDamage: 95 },
];

export async function getRandomMonster(
    worldLevel: number,
    location: string,
    playerStats: {
        currentHp: number;
        attackPower: number;
        critChance: number;
        critValue: number;
        defChance: number;
        defValue: number;
        maxHp: number;
    },
) {
    if (!monstersLoaded) {
        return null;
    }

    const availableMonsters = monsters.filter(
        (monster) =>
            worldLevel >= monster.minWorldLevel &&
            monster.locations.includes(location),
    );

    if (availableMonsters.length === 0) {
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
            selectedMonster = JSON.parse(JSON.stringify(monster));
            break;
        }
    }

    if (!selectedMonster) {
        return null;
    }

    if (selectedMonster.name === "Mirror Maiden") {
        selectedMonster.currentHp = playerStats.currentHp;
        selectedMonster.minDamage = playerStats.attackPower;
        selectedMonster.maxDamage = playerStats.attackPower;
        selectedMonster.critChance = playerStats.critChance;
        selectedMonster.critValue = playerStats.critValue;
        selectedMonster.defChance = playerStats.defChance;
        selectedMonster.defValue = playerStats.defValue;
        selectedMonster.minHp = playerStats.maxHp;
        selectedMonster.maxHp = playerStats.maxHp;
    }

    if (
        worldLevel > selectedMonster.minWorldLevel &&
        selectedMonster.name !== "Mirror Maiden"
    ) {
        const encounterAverages = lowEncounterAverages.find(
            (avg) => avg.worldLevel === worldLevel,
        );

        if (encounterAverages) {
            selectedMonster.minHp = encounterAverages.minHp;
            selectedMonster.maxHp = encounterAverages.maxHp;
            selectedMonster.minDamage = encounterAverages.minDamage;
            selectedMonster.maxDamage = encounterAverages.maxDamage;
        }
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

export interface AbyssMonster {
    name: string;
    minHp: number;
    maxHp: number;
    minDamage: number;
    maxDamage: number;
    image: string;
    critChance: number;
    critValue: number;
    defChance: number;
    defValue: number;
    quantity: number;
}

const abyssMonsters: AbyssMonster[] = [];
let abyssMonstersLoaded = false;

async function loadAbyssMonsters(dir: string): Promise<void> {
    const files = readdirSync(dir);

    for (const file of files) {
        const fullPath = join(dir, file);

        if (statSync(fullPath).isDirectory()) {
            await loadAbyssMonsters(fullPath);
        } else if ([".ts", ".js"].some((c) => file.endsWith(c))) {
            try {
                const abyssMonster = (await import(fullPath))
                    .default as AbyssMonster;
                if (
                    abyssMonster &&
                    !abyssMonsters.some((m) => m.name === abyssMonster.name)
                ) {
                    abyssMonsters.push(abyssMonster);
                }
            } catch (error) {
                log(
                    `Error loading abyss monster from file: ${fullPath}`,
                    error,
                );
            }
        }
    }
}

const abyssMonstersDir = resolve(__dirname, "./abyss");
const abyssDropsDir = resolve(__dirname, "./abyss");

export async function initializeAbyssMonsters(): Promise<void> {
    if (!abyssMonstersLoaded) {
        await loadAbyssMonsters(abyssMonstersDir);
        abyssMonstersLoaded = true;
        log(`Total abyss monsters loaded: ${abyssMonsters.length}`);
    }
}

export async function getMonstersForAbyssFloor(
    abyssFloor: number,
): Promise<AbyssMonster[]> {
    if (!abyssMonstersLoaded) {
        await initializeAbyssMonsters();
    }

    const floorFile = resolve(abyssMonstersDir, `abyssFloor${abyssFloor}.js`);

    try {
        const module = await import(floorFile);

        const monsters = module[`abyssFloor${abyssFloor}Monsters`];

        if (monsters) {
            const expandedMonsters: AbyssMonster[] = [];

            monsters.forEach((monster: AbyssMonster) => {
                const quantity = monster.quantity || 1;
                for (let i = 0; i < quantity; i++) {
                    expandedMonsters.push(JSON.parse(JSON.stringify(monster)));
                }
            });

            return expandedMonsters;
        } else {
            return [];
        }
    } catch (error) {
        return [];
    }
}

export async function getDropsForAbyssFloor(
    abyssFloor: number,
): Promise<{ item: string; amount: number }[]> {
    const floorFile = resolve(abyssDropsDir, `abyssFloor${abyssFloor}.js`);

    try {
        const module = await import(floorFile);

        const drops = module[`abyssFloor${abyssFloor}Drops`];

        if (drops) {
            return drops;
        } else {
            return [];
        }
    } catch (error) {
        return [];
    }
}

export { abyssMonsters, abyssMonstersLoaded };
