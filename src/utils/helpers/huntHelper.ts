import { getRandomValue, is, make } from "@elara-services/utils";
import { type UserStats } from "@prisma/client";
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import { debug } from "..";
import { locationGroupWeights } from "../locationGroupWeights";
import type { WeaponType } from "../rpgitems/weapons";
import { getUserSkillLevelData } from "../skillsData";
import { type MonsterElement, MonsterGroup } from "./monsterHelper";

export type MutationType = "Bloodthirsty" | "Strange" | "Infected" | "Demonic";

export interface Monster {
    startingHp: number;
    baseName: string;
    name: string;
    group: MonsterGroup;
    element: MonsterElement;
    minExp: number;
    maxExp: number;
    critChance: number;
    critValue: number;
    defChance: number;
    defValue: number;
    minadventurerank: number;
    image: string;
    isMutated?: boolean;
    mutationType?: MutationType;
    drops: {
        item: string;
        minAmount: number;
        maxAmount: number;
        chance: number;
    }[];
    getStatsForadventureRank: (adventureRank: number) => {
        minHp: number;
        maxHp: number;
        minDamage: number;
        maxDamage: number;
    } | null;
}

export interface MonsterInstance extends Monster {
    minHp: number;
    maxHp: number;
    minDamage: number;
    maxDamage: number;
}

export const monsters = make.array<Monster>();
export let monstersLoaded = false;

async function loadMonsters(dir: string) {
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
                debug(`Error loading monster from file: ${fullPath}`, error);
            }
        }
    }
}

const monstersDir = resolve(__dirname, "./../monsters");

export async function initializeMonsters() {
    if (!monstersLoaded) {
        await loadMonsters(monstersDir);
        monstersLoaded = true;
    }
}

export function calculateDrop(
    drops: {
        item: string;
        minAmount: number;
        maxAmount: number;
        chance: number;
    }[],
) {
    const droppedItems = make.array<{ item: string; amount: number }>();

    for (const drop of drops) {
        if (Math.random() * 100 < drop.chance) {
            const amount = getRandomValue(drop.minAmount, drop.maxAmount);
            droppedItems.push({ item: drop.item, amount });
        }
    }

    return droppedItems;
}

export async function getRandomMonster(
    adventureRank: number,
    location: string,
    playerStats: {
        startingHp: number;
        attackPower: number;
        critChance: number;
        critValue: number;
        defChance: number;
        defValue: number;
        maxHp: number;
        rebirths: number;
    },
): Promise<MonsterInstance | null> {
    if (!monstersLoaded) {
        return null;
    }

    const availableMonsters = monsters.filter(
        (monster) =>
            adventureRank >= monster.minadventurerank &&
            monster.group !== "Boss",
    );

    if (!is.array(availableMonsters)) {
        return null;
    }

    const uniqueGroups = make.array<MonsterGroup>([
        ...new Set(availableMonsters.map((monster) => monster.group)),
    ]);

    const groupWeightsForLocation =
        locationGroupWeights[location] || locationGroupWeights["Default"] || {};

    const groupWeights: { group: MonsterGroup; weight: number }[] =
        uniqueGroups.map((group) => ({
            group,
            weight:
                groupWeightsForLocation[group] ||
                locationGroupWeights["Default"][group] ||
                1,
        }));

    const totalGroupWeight = groupWeights.reduce(
        (acc, gw) => acc + gw.weight,
        0,
    );

    let randomGroupWeight = Math.random() * totalGroupWeight;
    let selectedGroup: MonsterGroup | null = null;

    for (const gw of groupWeights) {
        randomGroupWeight -= gw.weight;
        if (randomGroupWeight <= 0) {
            selectedGroup = gw.group;
            break;
        }
    }

    if (!selectedGroup) {
        return null;
    }

    const monstersInGroup = availableMonsters.filter(
        (monster) => monster.group === selectedGroup,
    );

    if (!is.array(monstersInGroup)) {
        return null;
    }

    const totalMonsterWeight = monstersInGroup.reduce(
        (acc, monster) => acc + monster.minadventurerank,
        0,
    );

    let randomMonsterWeight = Math.random() * totalMonsterWeight;
    let selectedMonster: Monster | null = null;

    for (const monster of monstersInGroup) {
        randomMonsterWeight -= monster.minadventurerank;
        if (randomMonsterWeight <= 0) {
            selectedMonster = monster;
            break;
        }
    }

    if (!selectedMonster) {
        return null;
    }

    if (selectedMonster.name === "Mirror Maiden") {
        const monsterInstance: MonsterInstance = {
            ...selectedMonster,
            startingHp: playerStats.maxHp,
            minDamage: playerStats.attackPower,
            maxDamage: playerStats.attackPower,
            critChance: playerStats.critChance,
            critValue: playerStats.critValue,
            defChance: playerStats.defChance,
            defValue: playerStats.defValue,
            minHp: playerStats.maxHp,
            maxHp: playerStats.maxHp,
        };

        return monsterInstance;
    }

    if (typeof selectedMonster.getStatsForadventureRank !== "function") {
        debug(
            `getStatsForadventureRank is not a function for monster: ${selectedMonster.name}`,
        );
        return null;
    }

    const stats = selectedMonster.getStatsForadventureRank
        ? selectedMonster.getStatsForadventureRank(adventureRank)
        : null;

    if (stats) {
        const rebirths = playerStats.rebirths || 0;
        const hpMultiplier = 1 + rebirths * 0.2;
        const damageMultiplier = 1 + rebirths * 0.1;

        stats.minHp = Math.floor(stats.minHp * hpMultiplier);
        stats.maxHp = Math.floor(stats.maxHp * hpMultiplier);
        stats.minDamage = Math.floor(stats.minDamage * damageMultiplier);
        stats.maxDamage = Math.floor(stats.maxDamage * damageMultiplier);

        const monsterInstance: MonsterInstance = {
            ...selectedMonster,
            minHp: stats.minHp,
            maxHp: stats.maxHp,
            minDamage: stats.minDamage,
            maxDamage: stats.maxDamage,
            startingHp: stats.minHp,
        };

        return monsterInstance;
    } else {
        debug(
            `Stats for Adventure Rank ${adventureRank} not found for monster: ${selectedMonster.name}`,
        );
        return null;
    }
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

const abyssMonsters = make.array<AbyssMonster>();
let abyssMonstersLoaded = false;

async function loadAbyssMonsters(dir: string) {
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
                debug(
                    `Error loading abyss monster from file: ${fullPath}`,
                    error,
                );
            }
        }
    }
}

const abyssMonstersDir = resolve(__dirname, "./abyss");

export async function initializeAbyssMonsters() {
    if (!abyssMonstersLoaded) {
        await loadAbyssMonsters(abyssMonstersDir);
        abyssMonstersLoaded = true;
        debug(`Total abyss monsters loaded: ${abyssMonsters.length}`);
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
        const mod = await import(floorFile);

        const monsters = mod[`abyssFloor${abyssFloor}Monsters`];

        if (monsters) {
            const expandedMonsters = make.array<AbyssMonster>();

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
    const floorFile = resolve(abyssMonstersDir, `abyssFloor${abyssFloor}.js`);

    try {
        const drops = (await import(floorFile))?.[
            `abyssFloor${abyssFloor}Drops`
        ];

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

export async function getMonsterByName(
    name: string,
    adventureRank?: number,
): Promise<MonsterInstance | null> {
    if (!monstersLoaded) {
        await initializeMonsters();
    }

    const monster = monsters.find((monster) => monster.name === name);

    if (!monster) {
        debug(`Monster with name "${name}" not found.`);
        return null;
    }

    if (typeof monster.getStatsForadventureRank !== "function") {
        debug(
            `getStatsForadventureRank is not a function for monster: ${monster.name}`,
        );
        return null;
    }

    const selectedadventureRank = adventureRank ?? monster.minadventurerank;

    const stats = monster.getStatsForadventureRank(selectedadventureRank);

    if (stats) {
        const monsterInstance: MonsterInstance = {
            ...monster,
            minHp: stats.minHp,
            maxHp: stats.maxHp,
            minDamage: stats.minDamage,
            maxDamage: stats.maxDamage,
            startingHp: stats.minHp,
        };

        debug(
            `Created MonsterInstance for ${monster.name} at Adventure Rank ${selectedadventureRank}.`,
        );
        return monsterInstance;
    } else {
        debug(
            `Stats for Adventure Rank ${selectedadventureRank} not found for monster: ${monster.name}`,
        );
        return null;
    }
}

export async function getMonstersByName(names: string[]) {
    const mons = make.array<Monster>();
    for await (const n of names) {
        const f = await getMonsterByName(n);
        if (f) {
            mons.push(f);
        }
    }
    return mons;
}

export const weaponAdvantages: { [key in WeaponType]?: MonsterGroup[] } = {
    Sword: [MonsterGroup.Nobushi, MonsterGroup.Eremite],
    Polearm: [MonsterGroup.Slime, MonsterGroup.Hilichurl],
    Catalyst: [MonsterGroup.Fatui, MonsterGroup.Abyss],
    Claymore: [MonsterGroup.Machine],
    Bow: [MonsterGroup.Human, MonsterGroup.Abyss],
    Rod: [MonsterGroup.Slime],
};

export async function generateNextHuntMonsters(
    stats: UserStats,
): Promise<Monster[]> {
    await initializeMonsters();

    const bossEncounters: Record<number, string> = {
        5: "Electro Hypostasis",
        10: "Cryo Regisvine",
        15: "Rhodeia of Loch",
        20: "Primo Geovishap",
    };
    let isBossEncounter = false;
    let bossName = "";

    if (
        bossEncounters[stats.adventureRank] &&
        !stats.beatenBosses.includes(bossEncounters[stats.adventureRank])
    ) {
        isBossEncounter = true;
        bossName = bossEncounters[stats.adventureRank];
    }

    let numberOfMonsters = isBossEncounter
        ? 1
        : stats.adventureRank <= 5
          ? 1
          : stats.adventureRank <= 15
            ? Math.random() < 0.75
                ? 2
                : 1
            : stats.adventureRank <= 25
              ? Math.random() < 0.75
                  ? 2
                  : 3
              : stats.adventureRank <= 35
                ? Math.random() < 0.5
                    ? 2
                    : 3
                : 3;

    const tauntSkill = getUserSkillLevelData(stats, "Taunt");
    const pacifistSkill = getUserSkillLevelData(stats, "Pacifist");

    if (
        tauntSkill &&
        tauntSkill.level > 0 &&
        stats.activeSkills.includes("Taunt")
    ) {
        numberOfMonsters += 1;
    }

    if (
        pacifistSkill &&
        pacifistSkill.level > 0 &&
        stats.activeSkills.includes("Pacifist")
    ) {
        numberOfMonsters -= 1;
    }

    const monstersEncountered: Monster[] = [];

    for (let i = 0; i < numberOfMonsters; i++) {
        let monster: Monster | null;

        if (isBossEncounter) {
            monster = await getMonsterByName(bossName);
            if (!monster) {
                break;
            }
        } else {
            monster = await getRandomMonster(
                stats.adventureRank,
                stats.location,
                {
                    startingHp: stats.hp,
                    attackPower: stats.attackPower,
                    critChance: stats.critChance,
                    critValue: stats.critValue,
                    defChance: stats.defChance,
                    defValue: stats.defValue,
                    maxHp: stats.maxHP,
                    rebirths: stats.rebirths,
                },
            );
        }
        if (!monster) {
            continue;
        }

        const baseName = monster.name;
        monster.baseName = baseName;

        let preventMutation = false;
        if (stats.activeSkills.includes("Stealth")) {
            preventMutation = true;
        }

        const mutationChance = Math.min(stats.rebirths * 5, 100);
        const canMutate = Math.random() * 100 < mutationChance;
        if (canMutate) {
            const mutationTypes: MutationType[] = [
                "Bloodthirsty",
                "Strange",
                "Infected",
            ];
            if (stats.rebirths >= 6) {
                mutationTypes.push("Demonic");
            }
            const chosen =
                mutationTypes[Math.floor(Math.random() * mutationTypes.length)];

            if (chosen === "Demonic" || !preventMutation) {
                monster.mutationType = chosen;
                monster.name = `${chosen} ${monster.name}`;
            }
        }

        monstersEncountered.push(monster);
        if (isBossEncounter) {
            break;
        }
    }

    return monstersEncountered;
}
