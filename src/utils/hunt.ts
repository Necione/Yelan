import { log } from "@elara-services/utils";
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";

export interface Monster {
    name: string;
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

    let monstersAtCurrentLevel = monsters.filter(
        (monster) => monster.minWorldLevel === worldLevel,
    );

    let scalingFactor = 1;

    if (monstersAtCurrentLevel.length === 0) {
        log(
            `No monsters found for world level ${worldLevel}. Searching for the closest lower world level...`,
        );

        const highestDefinedLevel = Math.max(
            ...monsters.map((monster) => monster.minWorldLevel),
        );
        if (worldLevel > highestDefinedLevel) {
            log(
                `Using monsters from the highest available world level: ${highestDefinedLevel}`,
            );

            const levelDifference = worldLevel - highestDefinedLevel;
            scalingFactor = Math.pow(1.1, levelDifference);
            log(
                `Scaling factor due to world level difference: ${scalingFactor}`,
            );

            monstersAtCurrentLevel = monsters.filter(
                (monster) => monster.minWorldLevel === highestDefinedLevel,
            );
        } else {
            log("No higher level monsters available.");
            return null;
        }
    }

    const randomCurrentLevelMonster =
        monstersAtCurrentLevel[
            Math.floor(Math.random() * monstersAtCurrentLevel.length)
        ];

    log(
        `Random monster chosen from world level (${randomCurrentLevelMonster.minWorldLevel}):`,
        randomCurrentLevelMonster,
    );

    const randomMonster =
        availableMonsters[Math.floor(Math.random() * availableMonsters.length)];

    log(`Randomly encountered monster:`, randomMonster);

    if (worldLevel > randomMonster.minWorldLevel) {
        const levelDifference = worldLevel - randomMonster.minWorldLevel;
        const reductionFactor = Math.max(0.85, 1 - 0.05 * levelDifference);
        log(
            `Level difference: ${levelDifference}, Reduction factor: ${reductionFactor}`,
        );

        const scaledMinHp = Math.floor(
            randomCurrentLevelMonster.minHp * reductionFactor,
        );
        const scaledMaxHp = Math.floor(
            randomCurrentLevelMonster.maxHp * reductionFactor,
        );
        const scaledMinDamage = Math.floor(
            randomCurrentLevelMonster.minDamage * reductionFactor,
        );
        const scaledMaxDamage = Math.floor(
            randomCurrentLevelMonster.maxDamage * reductionFactor,
        );

        log(`Scaled Min HP: ${scaledMinHp}, Scaled Max HP: ${scaledMaxHp}`);
        log(
            `Scaled Min Damage: ${scaledMinDamage}, Scaled Max Damage: ${scaledMaxDamage}`,
        );

        randomMonster.minHp = scaledMinHp;
        randomMonster.maxHp = scaledMaxHp;
        randomMonster.minDamage = scaledMinDamage;
        randomMonster.maxDamage = scaledMaxDamage;
    }

    if (scalingFactor > 1) {
        const scaledMinHp = Math.floor(
            randomCurrentLevelMonster.minHp * scalingFactor,
        );
        const scaledMaxHp = Math.floor(
            randomCurrentLevelMonster.maxHp * scalingFactor,
        );
        const scaledMinDamage = Math.floor(
            randomCurrentLevelMonster.minDamage * scalingFactor,
        );
        const scaledMaxDamage = Math.floor(
            randomCurrentLevelMonster.maxDamage * scalingFactor,
        );

        log(`Scaled Min HP: ${scaledMinHp}, Scaled Max HP: ${scaledMaxHp}`);
        log(
            `Scaled Min Damage: ${scaledMinDamage}, Scaled Max Damage: ${scaledMaxDamage}`,
        );

        randomMonster.minHp = scaledMinHp;
        randomMonster.maxHp = scaledMaxHp;
        randomMonster.minDamage = scaledMinDamage;
        randomMonster.maxDamage = scaledMaxDamage;
    }

    return randomMonster;
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
