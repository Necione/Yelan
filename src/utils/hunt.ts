import * as fs from "fs";
import * as path from "path";

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
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);

        if (file === "bosses" && fs.statSync(fullPath).isDirectory()) {
            continue;
        }

        if (fs.statSync(fullPath).isDirectory()) {
            await loadMonsters(fullPath);
        } else if (file.endsWith(".ts") || file.endsWith(".js")) {
            try {
                const monsterModule = await import(fullPath);
                const monster = monsterModule.default as Monster;

                if (monster && !monsters.some((m) => m.name === monster.name)) {
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
    if (!monstersLoaded) {
        await loadMonsters(monstersDir);
        monstersLoaded = true;
        console.log(`Total monsters loaded: ${monsters.length}`);
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
        return null;
    }

    const groups: { [groupName: string]: Monster[] } = {
        Slime: [],
        HilichurlGroup: [],
        Treasure: [],
        Others: [],
    };

    availableMonsters.forEach((monster) => {
        if (monster.name.includes("Slime")) {
            groups.Slime.push(monster);
        } else if (
            monster.name.includes("Samachurl") ||
            monster.name.includes("Hilichurl") ||
            monster.name.includes("Lawachurl")
        ) {
            groups.HilichurlGroup.push(monster);
        } else if (monster.name.includes("Treasure")) {
            groups.Treasure.push(monster);
        } else {
            groups.Others.push(monster);
        }
    });

    const activeGroups = Object.keys(groups).filter(
        (groupName) => groups[groupName].length > 0,
    );
    const randomGroupName =
        activeGroups[Math.floor(Math.random() * activeGroups.length)];
    const selectedGroup = groups[randomGroupName];

    const weightedMonsters: Monster[] = selectedGroup.flatMap((monster) => {
        const weight = monster.minWorldLevel;
        return Array(weight).fill(monster);
    });

    const randomMonster =
        weightedMonsters[Math.floor(Math.random() * weightedMonsters.length)];

    const hpScalingConstant = 0.5;
    const damageScalingConstant = 0.22;

    const levelDifference = worldLevel - randomMonster.minWorldLevel;

    if (levelDifference > 0) {
        const hpScalingFactor = 1 + hpScalingConstant * levelDifference;
        const damageScalingFactor = 1 + damageScalingConstant * levelDifference;

        randomMonster.minHp = Math.floor(randomMonster.minHp * hpScalingFactor);
        randomMonster.maxHp = Math.floor(randomMonster.maxHp * hpScalingFactor);

        randomMonster.minDamage = Math.floor(
            randomMonster.minDamage * damageScalingFactor,
        );
        randomMonster.maxDamage = Math.floor(
            randomMonster.maxDamage * damageScalingFactor,
        );
    }

    return randomMonster;
}

export async function getRandomBoss(
    worldLevel: number,
): Promise<Monster | null> {
    const bossDir = path.resolve(__dirname, "./monsters/bosses");
    const bossFiles = fs.readdirSync(bossDir);

    const bosses: Monster[] = [];
    for (const file of bossFiles) {
        const fullPath = path.join(bossDir, file);
        if (
            fs.statSync(fullPath).isFile() &&
            (file.endsWith(".ts") || file.endsWith(".js"))
        ) {
            try {
                const bossModule = await import(fullPath);
                const boss = bossModule.default as Monster;
                if (boss && worldLevel >= boss.minWorldLevel) {
                    bosses.push(boss);
                }
            } catch (error) {
                console.error(
                    `Error loading boss from file: ${fullPath}`,
                    error,
                );
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
