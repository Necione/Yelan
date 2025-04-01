import { getRandomValue, is, make } from "@elara-services/utils";
import { type UserStats } from "@prisma/client";
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import { debug } from "..";
import { locationGroupWeights } from "../locationGroupWeights";
import type { WeaponType } from "../rpgitems/weapons";
import { getUserSkillLevelData } from "../skillsData";
import { type MonsterElement, MonsterGroup } from "./monsterHelper";

export type MutationType =
    | "Bloodthirsty"
    | "Strange"
    | "Infected"
    | "Demonic"
    | "Poisonous"
    | "Hard";

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
    dodgeChance?: number;
    minadventurerank: number;
    image: string;
    isMutated?: boolean;
    mutationType?: MutationType;
    souls?: number;
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

        const startingHp = selectedMonster.name.includes("Mirror Maiden")
            ? playerStats.maxHp
            : stats.minHp;

        const monsterInstance: MonsterInstance = {
            ...selectedMonster,
            minHp: stats.minHp,
            maxHp: stats.maxHp,
            minDamage: stats.minDamage,
            maxDamage: stats.maxDamage,
            startingHp,
        };

        return monsterInstance;
    }
    return null;
}

export function getEncounterDescription(monster: MonsterInstance) {
    const lines = make.array<string>();

    if (is.number(monster.critChance) && monster.critChance > 0) {
        lines.push(
            `🎯 Crit Rate: \`${Math.min(
                100,
                Math.round(monster.critChance),
            )}%\``,
        );
    }

    if (is.number(monster.critValue) && monster.critValue > 0) {
        lines.push(
            `💥 Crit Value: \`${Math.min(3.0, monster.critValue).toFixed(
                2,
            )}x\``,
        );
    }

    if (is.number(monster.defChance) && monster.defChance > 0) {
        lines.push(
            `🛡️ Defense Rate: \`${Math.min(
                100,
                Math.round(monster.defChance),
            )}%\``,
        );
    }

    if (is.number(monster.defValue) && monster.defValue > 0) {
        lines.push(`🔰 Defense Value: \`${monster.defValue}\``);
    }

    if (monster.group === "Machine") {
        lines.push(`⚙️ Ignores player defenses`);
    }
    if (monster.group === "Boss") {
        lines.push(`👑 25% chance to dodge attacks`);
    }
    if (monster.group === "Fatui") {
        lines.push(`〽️ 25% chance to displace player (reduce damage by 80%)`);
    }
    if (["Boss", "Beast", "Eremite"].includes(monster.group)) {
        lines.push(`🧬 Immune to Leech skill`);
    }

    if (lines.length === 0) {
        return "A mysterious creature appears before you...";
    }

    return lines.join("\n");
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

export async function getMonstersByName(
    names: string[],
    adventureRank?: number,
) {
    const mons = make.array<Monster>();
    for await (const rawName of names) {
        const [baseName, mutation] = rawName.split("|");
        const monster = await getMonsterByName(baseName.trim(), adventureRank);
        if (monster) {
            if (mutation) {
                monster.mutationType = mutation as MutationType;
                monster.name = `${mutation} ${monster.name}`;
            }
            mons.push(monster);
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

    const isBossEncounter = false;
    const bossName = "";

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
        } else if (i === numberOfMonsters - 1) {
            const availableBosses = monsters.filter((m) => m.group === "Boss");
            if (availableBosses.length > 0 && Math.random() < 0.5) {
                const randomBoss =
                    availableBosses[
                        Math.floor(Math.random() * availableBosses.length)
                    ];
                monster = await getMonsterByName(randomBoss.name);
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
            preventMutation = Math.random() < 0.6;
        }

        const mutationChance = Math.min(stats.rebirths * 5, 100);
        const canMutate = Math.random() * 100 < mutationChance;
        if (canMutate && monster.group !== "Boss") {
            const mutationTypes: MutationType[] = [
                "Bloodthirsty",
                "Strange",
                "Infected",
                "Hard",
            ];
            if (stats.rebirths >= 6) {
                mutationTypes.push("Demonic");
            }
            const chosen =
                mutationTypes[Math.floor(Math.random() * mutationTypes.length)];

            if (chosen === "Demonic" || !preventMutation) {
                monster.mutationType = chosen;
                monster.name = `${chosen} ${monster.name}`;
                if (chosen === "Hard") {
                    monster.startingHp *= 2;
                }
            }
        }

        monstersEncountered.push(monster);
        if (isBossEncounter) {
            break;
        }
    }

    return monstersEncountered;
}
