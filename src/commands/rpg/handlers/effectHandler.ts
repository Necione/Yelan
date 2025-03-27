import type { UserStats } from "@prisma/client";
import { debug } from "../../../utils";
import { type Monster } from "../../../utils/helpers/huntHelper";
import { MonsterElement } from "../../../utils/helpers/monsterHelper";
import type { WeaponName } from "../../../utils/rpgitems/weapons";
import { getUserSkillLevelData } from "../../../utils/skillsData";
import type { MonsterState } from "./battleHandler";
import { applyShieldThenHp, has, isFishingMonster } from "./battleHandler";

export function applyElementalEffects(
    monster: Monster,
    monsterDamage: number,
    monsterState: MonsterState,
    stats: UserStats,
    messages: string[],
    damageReductionFactor: number,
): number {
    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;

    if (
        monster.element === MonsterElement.Electro &&
        !monsterState.isSuffocated &&
        Math.random() < 0.5 &&
        equippedWeaponName &&
        !equippedWeaponName.includes("Everlasting Moonglow")
    ) {
        const surgeDamage = Math.ceil(monsterDamage * 0.5);
        const leftoverSurge = applyShieldThenHp(stats, surgeDamage);
        stats.hp -= leftoverSurge;
        messages.push(
            `\`⚔️\` The ${monster.name} dealt \`${surgeDamage}\` damage to you \`⚡ SURGE\``,
        );
    }

    if (monster.element === MonsterElement.Pyro && !monsterState.isSuffocated) {
        const burnDamage = Math.ceil(
            stats.maxHP * (0.03 + 0.01 * Math.floor(stats.adventureRank / 2)),
        );
        const reducedBurnDamage = Math.ceil(burnDamage * damageReductionFactor);

        const leftover = applyShieldThenHp(stats, reducedBurnDamage);
        stats.hp -= leftover;
        messages.push(
            `\`🔥\` The ${monster.name} inflicted Burn! You took \`${reducedBurnDamage}\` Burn damage`,
        );
    }

    if (
        monster.element === MonsterElement.Hydro &&
        !monsterState.isSuffocated &&
        Math.random() < 0.5
    ) {
        const splashDamage = Math.ceil(stats.hp * 0.1);
        const leftover = applyShieldThenHp(stats, splashDamage);
        stats.hp -= leftover;
        messages.push(
            `\`⚔️\` The ${monster.name} dealt \`${splashDamage}\` damage to you \`💦 SPLASH\``,
        );
    }

    if (
        monster.element === MonsterElement.Cryo &&
        !monsterState.isSuffocated &&
        Math.random() < 0.5
    ) {
        const crippleDamage = Math.ceil(
            stats.maxHP * (0.05 + 0.01 * Math.floor(stats.adventureRank / 2)),
        );
        const reducedCrippleDamage = Math.floor(
            crippleDamage * damageReductionFactor,
        );
        const leftover = applyShieldThenHp(stats, reducedCrippleDamage);
        stats.hp -= leftover;
        messages.push(
            `\`❄️\` The ${monster.name} inflicted Cripple! You took \`${reducedCrippleDamage}\` Cripple damage`,
        );
    }

    return monsterDamage;
}

export function applyCrystallize(
    monsterDamage: number,
    monsterTurn: number,
    monster: Monster,
    username: string,
    messages: string[],
    stats: UserStats,
): number {
    const equippedWeaponName = stats?.equippedWeapon as WeaponName | undefined;
    const hasFreedomSworn = equippedWeaponName?.includes("Freedom-Sworn");

    if (!hasFreedomSworn && has(["Abyss"], monster, true)) {
        messages.push("`⚠️` Crystallize skill does not work on this monster");
        return monsterDamage;
    }

    let damageMultiplier = 1;
    let effectDescription = "";

    if (monsterTurn <= 6) {
        const reductionPercent = 25 - (monsterTurn - 1) * 5;
        damageMultiplier = 1 - reductionPercent / 100;
        effectDescription = `\`🧊\` Crystallize reduces the ${monster.name}'s damage by __${reductionPercent}%__`;
        messages.push(effectDescription);
        monsterDamage *= damageMultiplier;
        debug(
            `${username} Crystallize => -${reductionPercent}% => ${monsterDamage}`,
        );
    } else {
        const increasePercent = (monsterTurn - 6) * 5;
        damageMultiplier = 1 + increasePercent / 100;
        effectDescription = `\`🧊\` Crystallize increases the ${monster.name}'s damage by __${increasePercent}%__`;
        messages.push(effectDescription);
        monsterDamage *= damageMultiplier;
        debug(
            `${username} Crystallize => +${increasePercent}% => ${monsterDamage}`,
        );
    }
    return monsterDamage;
}

export function applyFatigue(
    monsterDamage: number,
    monsterTurn: number,
    monster: Monster,
    username: string,
    messages: string[],
    stats: UserStats,
): number {
    const equippedWeaponName = stats?.equippedWeapon as WeaponName | undefined;
    const hasFreedomSworn = equippedWeaponName?.includes("Freedom-Sworn");

    if (!hasFreedomSworn && has(["Abyss"], monster, true)) {
        messages.push("`⚠️` Fatigue skill does not work on this monster");
        return monsterDamage;
    }

    const percentChange = 50 - (monsterTurn - 1) * 10;
    let damageMultiplier = 1;
    let effectDescription = "";

    if (percentChange >= 0) {
        damageMultiplier = 1 + percentChange / 100;
        effectDescription = `\`🐌\` Fatigue increases the ${monster.name}'s damage by __${percentChange}%__`;
        debug(`${username} Fatigue => +${percentChange}% => monsterDamage`);
    } else {
        damageMultiplier = 1 + percentChange / 100;
        effectDescription = `\`🐌\` Fatigue reduces the ${
            monster.name
        }'s damage by __${Math.abs(percentChange)}%__`;
        debug(
            `${username} Fatigue => -${Math.abs(
                percentChange,
            )}% => monsterDamage`,
        );
    }
    monsterDamage *= damageMultiplier;
    messages.push(effectDescription);

    return monsterDamage;
}

export function applyLeechDrain(
    stats: UserStats,
    monster: Monster,
    currentPlayerHp: number,
    currentMonsterHp: number,
    effectiveMaxHp: number,
    messages: string[],
): number {
    const username = `[${stats.userId}]`;
    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;
    const hasFreedomSworn = equippedWeaponName?.includes("Freedom-Sworn");

    const leechLevelData = getUserSkillLevelData(stats, "Leech");
    if (leechLevelData) {
        if (
            hasFreedomSworn ||
            (!isFishingMonster(monster) &&
                !has(["Boss", "Beast", "Eremite", "Wayob"], monster, true))
        ) {
            const levelData = leechLevelData.levelData || {};
            const lifestealPercentage = levelData.lifestealPercentage || 0;
            const triggerChance = levelData.triggerChance || 0;

            const leechTriggered = Math.random() < triggerChance;
            if (leechTriggered) {
                const healAmount = Math.ceil(
                    monster.startingHp * lifestealPercentage,
                );
                currentPlayerHp = Math.min(
                    currentPlayerHp + healAmount,
                    effectiveMaxHp,
                );
                messages.push(
                    `\`💖\` Leech skill activated! You healed \`${healAmount}\` HP from the ${monster.name}`,
                );
                debug(`${username} => Leech +${healAmount} HP`);
            }
        } else {
            messages.push("`⚠️` Leech skill does not work on this monster");
        }
    }

    const drainLevelData = getUserSkillLevelData(stats, "Drain");
    if (drainLevelData) {
        if (
            hasFreedomSworn ||
            (!isFishingMonster(monster) &&
                !has(["Boss", "Beast", "Eremite", "Wayob"], monster, true))
        ) {
            const levelData = drainLevelData.levelData || {};
            const lifestealPercentage = levelData.lifestealPercentage || 0;
            const triggerChance = levelData.triggerChance || 0;

            const drainTriggered = Math.random() < triggerChance;
            if (drainTriggered && currentMonsterHp > 0) {
                const drainAmount = Math.ceil(
                    currentMonsterHp * lifestealPercentage,
                );
                currentMonsterHp = Math.max(currentMonsterHp - drainAmount, 0);

                const newHp = Math.min(
                    currentPlayerHp + drainAmount,
                    effectiveMaxHp,
                );
                messages.push(
                    `\`🩸\` Drain skill activated! You drained \`${drainAmount}\` HP from the ${monster.name}`,
                );
                debug(
                    `${username} => Drain +${drainAmount} HP => monster HP -${drainAmount}`,
                );
                return newHp;
            }
        } else {
            messages.push("`⚠️` Drain skill does not work on this monster");
        }
    }

    return currentPlayerHp;
}
