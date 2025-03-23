import { is } from "@elara-services/utils";
import { debug } from "..";
import {
    initializeMonsters,
    type Monster,
    type MonsterInstance,
    monsters,
    monstersLoaded,
} from "./huntHelper";
import { MonsterGroup } from "./monsterHelper";

interface FishingMonster extends Monster {
    minFishingLevel: number;
}

export async function getRandomFishingMonster(
    fishingLevel: number,
    playerStats: {
        attackPower: number;
        critChance: number;
        critValue: number;
        defChance: number;
        defValue: number;
        maxHP: number;
        rebirths: number;
    },
): Promise<MonsterInstance | null> {
    if (!monstersLoaded) {
        await initializeMonsters();
    }

    const availableMonsters = monsters.filter(
        (monster): monster is FishingMonster =>
            monster.group === MonsterGroup.Fishing &&
            typeof (monster as FishingMonster).minFishingLevel === "number" &&
            fishingLevel >= (monster as FishingMonster).minFishingLevel,
    );

    if (!is.array(availableMonsters) || availableMonsters.length === 0) {
        return null;
    }

    const totalWeight = availableMonsters.reduce(
        (acc, monster) => acc + monster.minFishingLevel,
        0,
    );
    let randomWeight = Math.random() * totalWeight;
    let selectedMonster: FishingMonster | null = null;
    for (const monster of availableMonsters) {
        randomWeight -= monster.minFishingLevel;
        if (randomWeight <= 0) {
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

    const stats = selectedMonster.getStatsForadventureRank(fishingLevel);
    if (!stats) {
        debug(
            `Stats not found for fishing level ${fishingLevel} for monster: ${selectedMonster.name}`,
        );
        return null;
    }

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
}
