import { getRandomValue, is, make } from "@elara-services/utils";
import type { Prisma, UserStats } from "@prisma/client";
import { skills } from "../../../plugins/other/utils";
import { updateUserStats } from "../../../services";
import { weaponAdvantages, type Monster } from "../../../utils/hunt";
import { masteryBenefits } from "../../../utils/masteryData";
import { calculateMasteryLevel } from "../../../utils/masteryHelper";
import { MonsterElement, MonsterGroup } from "../../../utils/monsterHelper";
import type { WeaponName, WeaponType } from "../../../utils/rpgitems/weapons";
import { weapons } from "../../../utils/rpgitems/weapons";
import { getUserSkillLevelData } from "../../../utils/skillsData";
import {
    applyCrystallize,
    applyElementalEffects,
    applyFatigue,
    applyLeechDrain,
} from "./effectHandler";

export type MonsterState = {
    displaced: boolean;
    vanishedUsed: boolean;
    stunned?: boolean;
    poisoned?: boolean;
    shieldUsed?: boolean;
    dendroAttackMultiplier?: number;
    isEnraged?: boolean;
    fortressUsed?: boolean;
};

export function getDeathThreshold(stats: UserStats): number {
    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;
    if (equippedWeaponName && equippedWeaponName.includes("Memory of Dust")) {
        return -500;
    }
    return 0;
}

export function has(
    names: string[] | string,
    monster: Monster,
    isGroup?: boolean,
) {
    if (is.string(names)) {
        names = [names];
    }
    if (isGroup) {
        return names.some(
            (c) => monster.group === c || monster.group.includes(c),
        );
    }
    return names.some((c) => monster.name === c || monster.name.includes(c));
}

export async function playerAttack(
    stats: UserStats,
    monster: Monster,
    currentPlayerHp: number,
    currentMonsterHp: number,
    vigilanceUsed: boolean,
    monsterState: MonsterState,
    messages: string[],
    hasWrath: boolean,
): Promise<{
    currentMonsterHp: number;
    currentPlayerHp: number;
    vigilanceUsed: boolean;
    monsterState: MonsterState;
}> {
    const username = `[${stats.userId}]`;

    if (stats.castQueue.length > 0) {
        const spellName = stats.castQueue[0];
        console.log(`${username} Casting spell: ${spellName}`);

        switch (spellName) {
            case "Heal": {
                const healAmount = Math.floor(0.15 * stats.maxHP);
                currentPlayerHp = Math.min(
                    currentPlayerHp + healAmount,
                    stats.maxHP,
                );
                messages.push(
                    `\`✨\` Heal spell casted! Restored \`${healAmount}\` HP`,
                );
                console.log(
                    `${username} Heal spell: Restored ${healAmount} HP`,
                );
                break;
            }

            case "Fury": {
                stats.attackPower *= 2;
                messages.push(
                    `\`⚡\` Fury spell casted! Your next attack will deal double damage`,
                );
                console.log(
                    `${username} Fury spell: Attack power doubled to ${stats.attackPower}`,
                );
                break;
            }

            case "Burn": {
                const burnDamage = Math.floor(0.5 * currentMonsterHp);
                currentMonsterHp = Math.max(currentMonsterHp - burnDamage, 0);

                messages.push(
                    `\`🔥\` Burn spell casted! Dealt \`${burnDamage}\` damage to the ${monster.name}`,
                );
                console.log(
                    `${username} Burn spell: Dealt ${burnDamage} damage to ${monster.name}`,
                );
                break;
            }

            case "Cripple": {
                const crippleDamage = Math.floor(0.1 * monster.startingHp);
                currentMonsterHp = Math.max(
                    currentMonsterHp - crippleDamage,
                    0,
                );

                messages.push(
                    `\`❄️\` Cripple spell casted! Dealt \`${crippleDamage}\` damage to the ${monster.name}`,
                );
                console.log(
                    `${username} Cripple spell: Dealt ${crippleDamage} damage to ${monster.name}`,
                );
                break;
            }

            case "Flare": {
                const flareDamage = currentPlayerHp / 2;
                currentMonsterHp = Math.max(currentMonsterHp - flareDamage, 0);
                messages.push(
                    `\`🎇\` Flare spell casted! Dealt \`${flareDamage}\` damage to the ${monster.name}`,
                );
                console.log(
                    `${username} Flare spell: Dealt ${flareDamage} damage to ${monster.name}`,
                );
                break;
            }

            case "Stun": {
                monsterState.stunned = true;
                messages.push(
                    `\`💫\` Stun spell casted! The enemy is stunned and will miss its next attack`,
                );
                console.log(
                    `${username} Stun spell: ${monster.name} is stunned`,
                );
                break;
            }

            case "Poison": {
                if (!monsterState.poisoned) {
                    monsterState.poisoned = true;
                    messages.push(
                        `\`💚\` Poison spell casted! The ${monster.name} is poisoned and will lose __10%__ of its HP each turn`,
                    );
                    console.log(
                        `${username} Poison spell: ${monster.name} is now poisoned`,
                    );
                } else {
                    messages.push(
                        `\`💚\` Poison spell casted again! The ${monster.name} is already poisoned`,
                    );
                    console.log(
                        `${username} Poison spell: ${monster.name} was already poisoned`,
                    );
                }
                break;
            }

            default:
                messages.push(
                    `\`❓\` The spell "${spellName}" was found but has no effect`,
                );
                console.log(
                    `${username} Unknown spell: "${spellName}" has no effect`,
                );
                break;
        }

        stats.castQueue.shift();

        const updateData: Prisma.UserStatsUpdateInput = {
            castQueue: { set: stats.castQueue },
        };
        if (spellName === "Heal") {
            updateData.hp = { set: currentPlayerHp };
        }
        if (spellName === "Fury") {
            updateData.attackPower = { set: stats.attackPower };
        }
        await updateUserStats(stats.userId, updateData);
    }

    if (isFishingMonster(monster)) {
        messages.push(
            "`🎣` This is a fishing monster. All your skills are disabled!",
        );
        console.log(
            `${username} Fishing monster encountered: skipping skill-based logic.`,
        );

        const baseAttack = stats.attackPower || 0;
        currentMonsterHp = Math.max(currentMonsterHp - baseAttack, 0);

        messages.push(
            `\`⚔️\` You dealt \`${baseAttack.toFixed(
                2,
            )}\` basic damage to the ${monster.name} \`(FISHING)\``,
        );
        console.log(`${username} Fishing attack: Dealt ${baseAttack} damage`);

        return {
            currentMonsterHp,
            currentPlayerHp,
            vigilanceUsed,
            monsterState,
        };
    }

    const usernameLog = `[${stats.userId}]`;

    // eslint-disable-next-line prefer-const
    let { paladinSwapped, attackPower } = getEffectiveStats(stats);
    const debugMultipliers: string[] = [];

    if (paladinSwapped) {
        messages.push(
            `\`🛡️\` Paladin skill activated! Your ATK and DEF Value have been swapped`,
        );
        debugMultipliers.push("Paladin Swapped (ATK and DEF)");
        console.log(
            `${usernameLog} Paladin skill activated: ATK and DEF swapped`,
        );
    }

    if (hasWrath) {
        attackPower *= 1.5;
        messages.push(
            `\`💢\` Wrath skill activated! You deal __150%__ more damage`,
        );
        debugMultipliers.push("Wrath (1.5x)");
        console.log(
            `${usernameLog} Wrath skill: Attack power * 1.5 = ${attackPower}`,
        );
    }

    if (monsterState.poisoned) {
        const poisonDamage = Math.floor(0.2 * monster.startingHp);
        currentMonsterHp = Math.max(currentMonsterHp - poisonDamage, 0);
        messages.push(
            `\`💚\` Poisoned! The ${monster.name} loses \`${poisonDamage}\` HP due to poison`,
        );
        debugMultipliers.push(`Poison Damage (${poisonDamage} HP)`);
        console.log(
            `${usernameLog} Poison effect: -${poisonDamage} HP to ${monster.name}`,
        );

        if (currentMonsterHp === 0) {
            monsterState.poisoned = false;
            console.log(
                `${usernameLog} Poison effect ended: monster HP is now 0`,
            );
        }
    }

    const hasVigor = skills.has(stats, "Vigor");
    if (hasVigor) {
        const hpPercentage = (currentPlayerHp / stats.maxHP) * 100;
        if (hpPercentage < 25) {
            attackPower *= 1.5;
            messages.push(
                `\`💪\` Vigor skill activated! Your low HP grants you __150%__ more damage`,
            );
            debugMultipliers.push("Vigor (1.5x)");
            console.log(
                `${usernameLog} Vigor skill: Attack power * 1.5 = ${attackPower}`,
            );
        }
    }

    const modifiersResult = applyAttackModifiers(
        attackPower,
        stats,
        monster,
        monsterState,
        messages,
    );
    attackPower = modifiersResult.attackPower;
    monsterState = modifiersResult.monsterState;

    let critChance = stats.critChance || 0;
    const critValue = stats.critValue || 1;
    const isNobushi = has("Nobushi", monster, true);
    if (isNobushi) {
        critChance = 0;
        messages.push(
            `\`👹\` The Ninja's Code prevents you from landing a critical hit`,
        );
        console.log(`${usernameLog} Nobushi trait: Crit disabled`);
    }
    const { isCrit, multiplier } = calculateCriticalHit(critChance, critValue);
    if (isCrit) {
        debugMultipliers.push(`Critical Hit (${multiplier}x)`);
        console.log(`${usernameLog} Critical hit! * ${multiplier}`);
    }
    attackPower *= multiplier;

    if (currentPlayerHp > stats.maxHP) {
        attackPower *= 0.5;
        messages.push(`\`💜\` Overhealed! Your damage is halved`);
        debugMultipliers.push("Overheal (0.5x)");
        console.log(
            `${usernameLog} Overheal penalty: Attack power halved => ${attackPower}`,
        );
    }

    const defenseResult = checkMonsterDefenses(
        attackPower,
        stats,
        monster,
        monsterState,
        messages,
    );
    attackPower = defenseResult.attackPower;
    const attackMissed = defenseResult.attackMissed;
    const monsterDefended = defenseResult.monsterDefended;
    const damageReduced = defenseResult.damageReduced;
    monsterState = defenseResult.monsterState;
    if (attackMissed) {
        console.log(`${usernameLog} Attack missed entirely`);
        return {
            currentMonsterHp,
            currentPlayerHp,
            vigilanceUsed,
            monsterState,
        };
    }

    const vigilanceLevelData = getUserSkillLevelData(stats, "Vigilance");
    if (vigilanceLevelData && !vigilanceUsed) {
        const levelData = vigilanceLevelData.levelData || {};
        const secondAttackPercentage = levelData.secondAttackPercentage || 0;
        const vigilanceAttackPower = attackPower * secondAttackPercentage;
        currentMonsterHp -= vigilanceAttackPower;
        vigilanceUsed = true;

        messages.push(
            `\`⚔️\` You dealt \`${vigilanceAttackPower.toFixed(
                2,
            )}\` bonus damage \`✨ VIGILANCE\``,
        );
        debugMultipliers.push(
            `Vigilance (+${(secondAttackPercentage * 100).toFixed(1)}%)`,
        );
        console.log(
            `${usernameLog} Vigilance: Extra ${vigilanceAttackPower} damage`,
        );
    }

    currentMonsterHp -= attackPower;
    debugMultipliers.push(`Final Attack Power (${attackPower})`);
    sendDamageMessage(
        attackPower,
        monster.name,
        isCrit,
        monsterDefended,
        damageReduced,
        messages,
    );
    console.log(
        `${usernameLog} Final Attack: ${attackPower}, multipliers= ${debugMultipliers.join(
            ", ",
        )}`,
    );

    const kindleLevelData = getUserSkillLevelData(stats, "Kindle");
    if (kindleLevelData && !isFishingMonster(monster)) {
        const levelData = kindleLevelData.levelData || {};
        const damageBonus = levelData.damageBonus || 0;

        const kindleBonusDamage = stats.maxHP * damageBonus;
        currentMonsterHp = Math.max(currentMonsterHp - kindleBonusDamage, 0);

        messages.push(
            `\`🔥\` The Kindle skill activates and deals an extra \`${kindleBonusDamage.toFixed(
                2,
            )}\` damage`,
        );
        debugMultipliers.push(`Kindle (${(damageBonus * 100).toFixed(0)}%)`);
        console.log(
            `${usernameLog} Kindle skill: +${kindleBonusDamage} damage`,
        );
    }

    const spiceLevelData = getUserSkillLevelData(stats, "Spice");
    if (spiceLevelData && currentMonsterHp > 0 && !isFishingMonster(monster)) {
        const levelData = spiceLevelData.levelData || {};
        const damageBonus = levelData.damageBonus || 0;

        const spiceDamageBonus = currentMonsterHp * damageBonus;
        currentMonsterHp = Math.max(currentMonsterHp - spiceDamageBonus, 0);

        messages.push(
            `\`🌶️\` The Spice skill activates and deals an extra \`${spiceDamageBonus.toFixed(
                2,
            )}\` damage`,
        );
        debugMultipliers.push(`Spice (${(damageBonus * 100).toFixed(0)}%)`);
        console.log(`${usernameLog} Spice skill: +${spiceDamageBonus} damage`);
    }

    if (
        has("Machine", monster, true) &&
        currentMonsterHp <= 0 &&
        !monsterState.shieldUsed
    ) {
        currentMonsterHp = 1;
        monsterState.shieldUsed = true;
        messages.push(
            "`⛔` The Machine's Shield prevents it from dying this turn!",
        );
        console.log(`${usernameLog} Machine shield saved the monster at 1 HP`);
    }

    const deathThreshold = getDeathThreshold(stats);
    if (currentPlayerHp <= deathThreshold) {
        currentPlayerHp = deathThreshold;
        console.log(
            `${usernameLog} Player HP below threshold => set to ${deathThreshold}`,
        );
    }

    return {
        currentMonsterHp,
        currentPlayerHp,
        vigilanceUsed,
        monsterState,
    };
}

export async function monsterAttack(
    stats: UserStats,
    monster: Monster,
    currentPlayerHp: number,
    currentMonsterHp: number,
    messages: string[],
    turnNumber: number,
    hasCrystallize: boolean,
    hasFatigue: boolean,
    monsterState: MonsterState,
    effectiveMaxHp: number,
): Promise<{
    currentPlayerHp: number;
    currentMonsterHp: number;
}> {
    const username = `[${stats.userId}]`;

    if (monsterState.stunned) {
        messages.push(
            `\`💫\` The ${monster.name} is stunned and couldn't attack this turn`,
        );
        console.log(
            `${username} ${monster.name} stunned => skip monster attack`,
        );
        monsterState.stunned = false;
        return { currentPlayerHp, currentMonsterHp };
    }

    if (isFishingMonster(monster)) {
        const monsterStats = monster.getStatsForadventureRank(
            stats.adventureRank,
        );
        if (!monsterStats) {
            throw new Error(`Stats not found for monster: ${monster.name}`);
        }
        const monsterDamage = getRandomValue(
            monsterStats.minDamage,
            monsterStats.maxDamage,
        );

        currentPlayerHp -= monsterDamage;
        messages.push(
            `\`⚔️\` The ${monster.name} dealt \`${monsterDamage.toFixed(
                2,
            )}\` damage to you \`(FISHING)\``,
        );
        console.log(
            `${username} Fishing monster => -${monsterDamage} HP to player`,
        );

        currentPlayerHp = Math.max(currentPlayerHp, getDeathThreshold(stats));
        await updateUserStats(stats.userId, { hp: { set: currentPlayerHp } });

        return { currentPlayerHp, currentMonsterHp };
    }

    const monsterStats = monster.getStatsForadventureRank(stats.adventureRank);
    if (!monsterStats) {
        throw new Error(`Stats not found for monster: ${monster.name}`);
    }

    if (monster.element === MonsterElement.Geo && Math.random() < 1) {
        const regenAmount = Math.ceil(monster.startingHp * 0.1);
        currentMonsterHp = Math.min(
            currentMonsterHp + regenAmount,
            monster.startingHp,
        );
        messages.push(
            `\`🌿\` The ${monster.name} regenerated \`${regenAmount}\` HP!`,
        );
        console.log(`${username} ${monster.name} +${regenAmount} HP (Geo)`);
    }

    let monsterDamage = getRandomValue(
        monsterStats.minDamage,
        monsterStats.maxDamage,
    );
    console.log(`${username} ${monster.name} base damage => ${monsterDamage}`);

    switch (monster.mutationType) {
        case "Bloodthirsty":
            monsterDamage *= 2;
            console.log(`${username} Bloodthirsty => x2 => ${monsterDamage}`);
            break;
        case "Strange":
            monsterDamage *= 1.5;
            console.log(`${username} Strange => x1.5 => ${monsterDamage}`);
            break;
        case "Infected":
            console.log(`${username} Infected => no direct damage change`);
            break;
    }

    if (turnNumber > 50) {
        if (!monsterState.isEnraged) {
            monsterState.isEnraged = true;
            monsterDamage *= 2;
            messages.push(`\`🐲\` The ${monster.name} became **enraged**!`);
            console.log(`${username} enrage => x2 => ${monsterDamage}`);
        } else {
            monsterDamage *= 2;
            console.log(
                `${username} monster already enraged => x2 => ${monsterDamage}`,
            );
        }
    }

    if (monster.element === MonsterElement.Dendro) {
        if (monsterState.dendroAttackMultiplier) {
            monsterState.dendroAttackMultiplier *= 1.1;
        } else {
            monsterState.dendroAttackMultiplier = 1.1;
        }
        monsterDamage *= monsterState.dendroAttackMultiplier;
        messages.push(
            `\`🍁\` The ${
                monster.name
            } grows stronger! +10% Dendro attack (now x${monsterState.dendroAttackMultiplier.toFixed(
                2,
            )})`,
        );
        console.log(
            `${username} Dendro => x${monsterState.dendroAttackMultiplier.toFixed(
                2,
            )} => ${monsterDamage}`,
        );
    }

    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;
    let monsterCritChance = monster.critChance || 0;
    let monsterCritValue = monster.critValue || 1;
    if (equippedWeaponName && equippedWeaponName.includes("Absolution")) {
        monsterCritChance = 0;
        monsterCritValue = 1;
        messages.push(
            "`⚜️` Your Absolution negates the monster's critical hits",
        );
        console.log(`${username} Absolution => monster crit disabled`);
    }

    const { isCrit, multiplier } = calculateCriticalHit(
        monsterCritChance,
        monsterCritValue,
    );
    if (isCrit) {
        console.log(`${username} ${monster.name} crit => x${multiplier}`);
    }
    monsterDamage *= multiplier;

    if (hasCrystallize && !isFishingMonster(monster)) {
        const monsterTurn = Math.ceil(turnNumber / 2);
        monsterDamage = applyCrystallize(
            monsterDamage,
            monsterTurn,
            monster.name,
            username,
            messages,
        );
    }
    if (hasFatigue && !isFishingMonster(monster)) {
        const monsterTurn = Math.ceil(turnNumber / 2);
        monsterDamage = applyFatigue(
            monsterDamage,
            monsterTurn,
            monster.name,
            username,
            messages,
        );
    }

    const { defValue } = getEffectiveStats(stats);
    const defChance = stats.defChance || 0;
    let defended = false;
    let damageReduced = 0;
    if (monster.group !== "Machine") {
        defended = Math.random() * 100 < defChance;
        if (defended) {
            const pre = monsterDamage;
            monsterDamage = (100 * monsterDamage) / (defValue + 25);
            damageReduced = pre - monsterDamage;
            console.log(
                `${username} defends => -${damageReduced} => ${monsterDamage}`,
            );
        }
    } else {
        messages.push(`\`⚙️\` The ${monster.name} ignores your defenses`);
        console.log(`${username} Machine => ignoring defenses`);
    }

    const hasVortexVanquisher =
        equippedWeaponName && equippedWeaponName.includes("Vortex Vanquisher");
    const damageReductionFactor = hasVortexVanquisher ? 0.5 : 1;
    if (hasVortexVanquisher) {
        messages.push("`🌀` Vortex Vanquisher => damage taken -50%");
        console.log(`${username} Vortex => monsterDamage * 0.5`);
    }

    monsterDamage = applyElementalEffects(
        monster,
        monsterDamage,
        stats,
        messages,
        damageReductionFactor,
    );

    let finalMonsterDamage = monsterDamage * damageReductionFactor;

    const hasBackstep = skills.has(stats, "Backstep");
    const hasParry = skills.has(stats, "Parry");
    if (hasBackstep && Math.random() < 0.25) {
        messages.push("`💨` You dodged the attack completely with Backstep");
        console.log(`${username} Backstep => 0 dmg`);
        finalMonsterDamage = 0;
    } else if (hasParry && Math.random() < 0.2) {
        const parried = finalMonsterDamage * 0.5;
        finalMonsterDamage *= 0.5;
        currentMonsterHp -= parried;
        messages.push(
            `\`🎆\` Parry => you reflected \`${parried.toFixed(
                2,
            )}\` damage back to the ${monster.name}`,
        );
        console.log(
            `${username} Parry => monster HP -${parried}, finalMonsterDamage => ${finalMonsterDamage}`,
        );
    }

    let resistanceReduced = 0;
    const resistanceEffect = stats.activeEffects.find(
        (eff) => eff.name === "Resistance" && eff.remainingUses > 0,
    );
    if (resistanceEffect) {
        const before = finalMonsterDamage;
        finalMonsterDamage *= resistanceEffect.effectValue;
        resistanceReduced = before - finalMonsterDamage;
        resistanceEffect.remainingUses -= 1;
        if (resistanceEffect.remainingUses <= 0) {
            stats.activeEffects = stats.activeEffects.filter(
                (eff) => eff !== resistanceEffect,
            );
            console.log(`${username} Resistance effect expired`);
        }
        console.log(
            `${username} Resistance => -${resistanceReduced} => ${finalMonsterDamage}`,
        );
    }

    currentPlayerHp -= finalMonsterDamage;
    console.log(`${username} took ${finalMonsterDamage} from ${monster.name}`);

    currentPlayerHp = applyLeechDrain(
        stats,
        monster,
        currentPlayerHp,
        currentMonsterHp,
        effectiveMaxHp,
        messages,
    );

    currentPlayerHp = Math.min(currentPlayerHp, effectiveMaxHp);
    console.log(`${username} HP after => ${currentPlayerHp}`);

    const deathThreshold = getDeathThreshold(stats);
    if (currentPlayerHp <= deathThreshold) {
        if (skills.has(stats, "Fortress") && !monsterState.fortressUsed) {
            currentPlayerHp = 1;
            monsterState.fortressUsed = true;
            messages.push(
                "`💀` Fortress skill activated! You should've died this turn",
            );
            console.log(`${username} Fortress => set HP = 1`);
        } else {
            currentPlayerHp = deathThreshold;
            console.log(`${username} HP below threshold => ${deathThreshold}`);
        }
    }

    await updateUserStats(stats.userId, {
        hp: { set: currentPlayerHp },
        activeEffects: { set: stats.activeEffects },
    });

    const critText =
        isCrit && !equippedWeaponName?.includes("Absolution")
            ? "`💢 CRIT`"
            : "";
    const defendText =
        defended && damageReduced > 0
            ? `\`🛡️ DEFENDED ${damageReduced.toFixed(2)}\``
            : "";
    const resistText =
        resistanceReduced > 0
            ? `\`🌺 RESIST ${resistanceReduced.toFixed(2)}\``
            : "";

    messages.push(
        `\`⚔️\` The ${monster.name} dealt \`${finalMonsterDamage.toFixed(
            2,
        )}\` damage to you ${defendText} ${critText} ${resistText}`,
    );
    console.log(
        `${username} finalMonsterDamage=${finalMonsterDamage}, defended=${defended}, resist=${resistanceReduced}`,
    );

    return { currentPlayerHp, currentMonsterHp };
}

export function applyAttackModifiers(
    attackPower: number,
    stats: UserStats,
    monster: Monster,
    monsterState: MonsterState,
    messages: string[],
): {
    attackPower: number;
    monsterState: MonsterState;
} {
    const username = `[${stats.userId}]`;
    const debugMultipliers: string[] = [];

    const hasBackstab = skills.has(stats, "Backstab");

    const isHumanOrFatui = has(
        [MonsterGroup.Human, MonsterGroup.Fatui, MonsterGroup.Nobushi],
        monster,
        true,
    );

    if (hasBackstab && isHumanOrFatui) {
        attackPower *= 1.5;
        messages.push(
            `\`🗡️\` Backstab skill activated! You deal __150%__ more DMG`,
        );
        debugMultipliers.push("Backstab (1.5x)");
        console.log(
            `${username} Backstab skill activated: Attack power multiplied by 1.5 to ${attackPower}`,
        );
    }

    if (monsterState.displaced) {
        attackPower *= 0.2;
        monsterState.displaced = false;
        messages.push(
            `\`〽️\` You are displaced! Your attack power is reduced by __80%__`,
        );
        debugMultipliers.push("Displaced (0.2x)");
        console.log(
            `${username} Displaced: Attack power reduced by 80% to ${attackPower}`,
        );
    }

    const weaknessEffect = stats.activeEffects.find(
        (effect) => effect.name === "Weakness" && effect.remainingUses > 0,
    );
    if (weaknessEffect) {
        attackPower *= 1 + weaknessEffect.effectValue;
        messages.push(
            `\`🥀\` Weakness effect applied! Your attack power is reduced by __${(
                weaknessEffect.effectValue * 100
            ).toFixed(0)}%__`,
        );
        debugMultipliers.push(
            `Weakness (${(weaknessEffect.effectValue * 100).toFixed(0)}%)`,
        );
        console.log(
            `${username} Weakness effect: Attack power multiplied by ${
                1 + weaknessEffect.effectValue
            } to ${attackPower}`,
        );
        weaknessEffect.remainingUses -= 1;
    }

    updateUserStats(stats.userId, {
        activeEffects: { set: stats.activeEffects },
    });

    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;

    if (equippedWeaponName && weapons[equippedWeaponName]) {
        const equippedWeapon = weapons[equippedWeaponName];
        const weaponType = equippedWeapon.type as WeaponType;

        const effectiveGroups = make.array<MonsterGroup>(
            weaponAdvantages[weaponType] || [],
        );

        if (has(effectiveGroups, monster, true)) {
            attackPower *= 1.1;
            messages.push(
                `\`⚔️\` **${weaponType}** advantage! You deal __110%__ more DMG to **${monster.group}**`,
            );
            debugMultipliers.push(`${weaponType} Advantage (1.1x)`);
            console.log(
                `${username} Weapon advantage: ${weaponType} multiplier applied, attack power is now ${attackPower}`,
            );
        }

        const masteryField = `mastery${weaponType}` as keyof UserStats;
        const masteryPointsRaw = stats[masteryField];
        const masteryPoints = is.number(masteryPointsRaw)
            ? masteryPointsRaw
            : 0;

        const { numericLevel } = calculateMasteryLevel(masteryPoints);

        let applicableMultiplier = 1;
        let appliedMasteryLevel = 0;

        for (let lvl = 1; lvl <= numericLevel; lvl++) {
            const benefit = masteryBenefits[weaponType]?.[lvl];
            if (benefit?.description) {
                const damageMultiplierMatch =
                    benefit.description.match(/(\d+)% damage/);
                if (damageMultiplierMatch) {
                    const multiplier =
                        parseInt(damageMultiplierMatch[1], 10) / 100;
                    if (multiplier > applicableMultiplier) {
                        applicableMultiplier = multiplier;
                        appliedMasteryLevel = lvl;
                    }
                }
            }
        }

        if (applicableMultiplier > 1) {
            attackPower *= applicableMultiplier;
            const benefitDescription =
                masteryBenefits[weaponType][appliedMasteryLevel]?.description;
            const masteryMessage = benefitDescription
                ? `\`➰\` Mastery Level ${appliedMasteryLevel} activated! Your ${weaponType} deals __${(
                      applicableMultiplier * 100
                  ).toFixed(0)}%__ damage.`
                : `\`➰\` Mastery Level ${appliedMasteryLevel} activated!`;

            messages.push(masteryMessage);
            debugMultipliers.push(
                `Mastery Level ${appliedMasteryLevel} (${(
                    applicableMultiplier * 100
                ).toFixed(0)}%)`,
            );
            console.log(
                `${username} Mastery Level ${appliedMasteryLevel} effect: ${weaponType} damage multiplied by ${applicableMultiplier} to ${attackPower}`,
            );
        }

        if (equippedWeaponName.includes("Wolf's Gravestone")) {
            const hpThreshold = Math.floor(monster.startingHp / 1000);
            if (hpThreshold > 0) {
                const damageMultiplier = 1 + 0.2 * hpThreshold;
                attackPower *= damageMultiplier;
                messages.push(
                    `\`🐺\` Wolf's Gravestone effect! You deal __${(
                        damageMultiplier * 100
                    ).toFixed(0)}%__ more damage based on the monster's HP`,
                );
                debugMultipliers.push(
                    `Wolf's Gravestone (${damageMultiplier * 100}%)`,
                );
                console.log(
                    `${username} Wolf's Gravestone effect: Damage multiplied by ${damageMultiplier} to ${attackPower}`,
                );
            }
        }
    }

    const furyEffect = stats.activeEffects.find(
        (effect) => effect.name === "Fury" && effect.remainingUses > 0,
    );
    if (furyEffect) {
        attackPower *= 2;
        messages.push(
            `\`⚡\` Fury effect activated! Your attack deals double damage this turn`,
        );
        debugMultipliers.push("Fury Effect (2x)");
        console.log(
            `${username} Fury effect: Attack power doubled to ${attackPower}`,
        );

        furyEffect.remainingUses -= 1;
        if (furyEffect.remainingUses <= 0) {
            stats.activeEffects = stats.activeEffects.filter(
                (effect) => effect !== furyEffect,
            );
            console.log(`${username} Fury effect expired`);
        }
    }

    console.log(
        `${username} Final Attack Power after modifiers: ${attackPower}, Multipliers applied: ${debugMultipliers.join(
            ", ",
        )}`,
    );

    return { attackPower, monsterState };
}

export function checkMonsterDefenses(
    attackPower: number,
    stats: UserStats,
    monster: Monster,
    monsterState: MonsterState,
    messages: string[],
): {
    attackPower: number;
    attackMissed: boolean;
    monsterDefended: boolean;
    damageReduced: number;
    monsterState: MonsterState;
} {
    const username = `[${stats.userId}]`;
    let attackMissed = false;
    let monsterDefended = false;
    let damageReduced = 0;

    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;

    if (has("Agent", monster) && !monsterState.vanishedUsed) {
        attackMissed = true;
        monsterState.vanishedUsed = true;
        messages.push(
            `\`👤\` The ${monster.name} has vanished, dodging your attack`,
        );
        console.log(
            `${username} Agent trait: ${monster.name} has vanished and dodged the attack`,
        );
    }

    if (
        monster.element === MonsterElement.Electro &&
        Math.random() < 0.25 &&
        equippedWeaponName &&
        !equippedWeaponName.includes("Everlasting Moonglow")
    ) {
        messages.push(
            `\`💫\` The ${monster.name} stunned you! You missed your attack`,
        );
        attackMissed = true;
        console.log(
            `${username} Electro element: ${monster.name} stunned the player, attack missed`,
        );
    }

    if (
        monster.element === MonsterElement.Anemo &&
        Math.random() < 0.25 &&
        equippedWeaponName &&
        !equippedWeaponName.includes("Everlasting Moonglow")
    ) {
        messages.push(
            `\`💨\` The ${monster.name} dodged your attack with its Anemo agility`,
        );
        attackMissed = true;
        console.log(
            `${username} Anemo element: ${monster.name} dodged the attack with agility`,
        );
    }

    if (has(["Boss"], monster, true) && Math.random() < 0.25) {
        messages.push(
            `\`👑\` The ${monster.name} dodged your attack with its superior agility`,
        );
        attackMissed = true;
        console.log(
            `${username} Boss trait: ${monster.name} dodged the attack with superior agility`,
        );
    }

    if (has(["Fatui"], monster, true) && Math.random() < 0.25) {
        monsterState.displaced = true;
        messages.push(
            `\`〽️\` The ${monster.name} displaced you! You will deal __80%__ less damage next turn`,
        );
        console.log(
            `${username} Fatui trait: ${monster.name} displaced the player, attack power will be reduced next turn`,
        );
    }

    let monsterDefChance = monster.defChance || 0;
    const monsterDefValue = monster.defValue || 0;

    if (equippedWeaponName && equippedWeaponName.includes("Calamity Queller")) {
        monsterDefChance = 0;
        messages.push(
            `\`🌊\` **Calamity Queller** prevents the ${monster.name} from defending`,
        );
        console.log(
            `${username} Calamity Queller equipped => monster's defChance = 0`,
        );
    }

    const monsterDefendedCheck = Math.random() * 100 < monsterDefChance;
    if (monsterDefendedCheck) {
        const initialAttackPower = attackPower;
        attackPower = (100 * attackPower) / (monsterDefValue + 25);
        damageReduced = initialAttackPower - attackPower;
        monsterDefended = true;
        console.log(
            `${username} ${monster.name} defended: Damage reduced by ${damageReduced} to ${attackPower}`,
        );
    }

    return {
        attackPower,
        attackMissed,
        monsterDefended,
        damageReduced,
        monsterState,
    };
}

function calculateCriticalHit(
    critChance: number,
    critValue: number,
): { isCrit: boolean; multiplier: number } {
    const isCrit = Math.random() * 100 < critChance;
    return { isCrit, multiplier: isCrit ? critValue : 1 };
}

function sendDamageMessage(
    damage: number,
    monsterName: string,
    isCrit: boolean,
    monsterDefended: boolean,
    damageReduced: number,
    messages: string[],
) {
    let message = `\`⚔️\` You dealt \`${damage.toFixed(
        2,
    )}\` damage to the ${monsterName}`;
    if (isCrit) {
        message += " `💢 CRIT`";
    }
    if (monsterDefended && damageReduced > 0) {
        message += ` \`🛡️ DEFENDED ${damageReduced.toFixed(2)}\``;
    }
    messages.push(message);
}

function getEffectiveStats(stats: UserStats): {
    attackPower: number;
    defValue: number;
    paladinSwapped: boolean;
} {
    let attackPower = stats.attackPower || 0;
    let defValue = stats.defValue || 0;
    let paladinSwapped = false;

    if (skills.has(stats, "Paladin")) {
        const temp = attackPower;
        attackPower = defValue / 2;
        defValue = temp;
        paladinSwapped = true;
    }

    return { attackPower, defValue, paladinSwapped };
}

export function isFishingMonster(monster: Monster): boolean {
    return has("Fishing", monster, true);
}
