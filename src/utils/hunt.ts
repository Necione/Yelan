import { log } from "@elara-services/utils";
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";

export interface Monster {
    name: string;
    group: string;
    baseHp: number;
    baseAtk: number;
    baseExp: number;
    hpConstant: number;
    atkConstant: number;
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

    const selectedMonster =
        monstersInGroup[Math.floor(Math.random() * monstersInGroup.length)];

    if (!selectedMonster) {
        return null;
    }

    return JSON.parse(JSON.stringify(selectedMonster));
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
