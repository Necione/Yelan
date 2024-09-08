import * as fs from "fs";
import * as path from "path";

interface Monster {
    name: string;
    minHp: number;
    maxHp: number;
    minDamage: number;
    maxDamage: number;
    minExp: number;
    maxExp: number;
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
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);

        if (fs.statSync(fullPath).isDirectory()) {
            await loadMonsters(fullPath);
        } else if (file.endsWith(".ts") || file.endsWith(".js")) {
            try {
                const monsterModule = await import(fullPath);
                const monster = monsterModule.default as Monster;
                if (monster) {
                    monsters.push(monster);
                }
            } catch (error) {
                console.error(
                    `Error loading monster from file: ${fullPath}`,
                    error,
                );
            }
        }
    }
}

const monstersDir = path.resolve(__dirname, "./monsters");

export async function initializeMonsters(): Promise<void> {
    await loadMonsters(monstersDir);
    monstersLoaded = true;
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

    const weightedMonsters: Monster[] = availableMonsters.flatMap((monster) => {
        const weight = monster.minWorldLevel;
        return Array(weight).fill(monster);
    });

    const selectedMonster =
        weightedMonsters[Math.floor(Math.random() * weightedMonsters.length)];

    const levelDifference = worldLevel - selectedMonster.minWorldLevel;

    if (levelDifference > 0) {
        const attackScaleFactor = 1 + levelDifference * 0.25;
        selectedMonster.minDamage = Math.floor(
            selectedMonster.minDamage * attackScaleFactor,
        );
        selectedMonster.maxDamage = Math.floor(
            selectedMonster.maxDamage * attackScaleFactor,
        );

        const hpScaleFactor = 1 + levelDifference * 0.25;
        selectedMonster.minHp = Math.floor(
            selectedMonster.minHp * hpScaleFactor,
        );
        selectedMonster.maxHp = Math.floor(
            selectedMonster.maxHp * hpScaleFactor,
        );
    }

    return selectedMonster;
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
