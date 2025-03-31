import { getRandomValue, is, make } from "@elara-services/utils";
import type { Prisma, UserStats } from "@prisma/client";
import { skills } from "../../../plugins/other/utils";
import { updateUserStats } from "../../../services";
import { debug } from "../../../utils";
import {
    weaponAdvantages,
    type Monster,
} from "../../../utils/helpers/huntHelper";
import { calculateMasteryLevel } from "../../../utils/helpers/masteryHelper";
import {
    MonsterElement,
    MonsterGroup,
} from "../../../utils/helpers/monsterHelper";
import { masteryBenefits } from "../../../utils/masteryData";
import type { WeaponName, WeaponType } from "../../../utils/rpgitems/weapons";
import { weapons } from "../../../utils/rpgitems/weapons";
import { getUserSkillLevelData } from "../../../utils/skillsData";
import {
    applyCrystallize,
    applyElementalEffects,
    applyFatigue,
    applyLeechDrain,
} from "./effectHandler";
import { spellHandlers } from "./spellHandler";

export type MonsterState = {
    displaced: boolean;
    vanishedUsed: boolean;
    stunned?: boolean;
    poisoned?: boolean;
    shieldUsed?: boolean;
    dendroAttackMultiplier?: number;
    isEnraged?: boolean;
    fortressUsed?: boolean;
    isSuffocated?: boolean;
};

export function getDeathThreshold(stats: UserStats): number {
    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;

    if (
        stats.swordStyle === "Favonius Bladework" &&
        stats.styleFavonius >= 50
    ) {
        const equippedWeapon = weapons[equippedWeaponName as WeaponName];
        if (equippedWeapon?.type === "Sword") {
            return -Math.floor(stats.maxHP * 0.5);
        }
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
    effectiveMaxHp: number,
    vigilanceUsed: boolean,
    monsterState: MonsterState,
    messages: string[],
    hasWrath: boolean,
    turnNumber: number,
): Promise<{
    currentMonsterHp: number;
    currentPlayerHp: number;
    vigilanceUsed: boolean;
    monsterState: MonsterState;
}> {
    const username = `[${stats.userId}]`;

    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;
    const isFirstGreatMagic = equippedWeaponName?.includes(
        "The First Great Magic",
    );
    const hasFreedomSworn = equippedWeaponName?.includes("Freedom-Sworn");

    if (equippedWeaponName?.includes("Memory of Dust")) {
        const memoryDamage = Math.floor(currentMonsterHp * 0.2);
        currentMonsterHp = Math.max(currentMonsterHp - memoryDamage, 0);
        messages.push(
            `\`🌾\` Memory of Dust deals \`${memoryDamage}\` bonus damage`,
        );
        debug(`${username} Memory of Dust => -${memoryDamage} HP to monster`);
    }

    if (equippedWeaponName?.includes("Jadefall's Splendor")) {
        const healAmount = stats.resonance || 0;
        if (healAmount > 0) {
            currentPlayerHp = Math.min(
                currentPlayerHp + healAmount,
                effectiveMaxHp,
            );
            messages.push(
                `\`💠\` Jadefall's Splendor heals you for \`${healAmount}\` HP from your resonance`,
            );
            debug(
                `${username} Jadefall's Splendor healed for ${healAmount} HP from resonance`,
            );
        }
    }

    if (
        equippedWeaponName?.includes("Song of Broken Pines") &&
        typeof turnNumber === "number"
    ) {
        const exponentialDamage = Math.floor(Math.exp(turnNumber));
        currentMonsterHp = Math.max(currentMonsterHp - exponentialDamage, 0);
        messages.push(
            `\`🎼\` Song of Broken Pines deals \`${exponentialDamage}\` bonus damage`,
        );
        debug(
            `${username} Song of Broken Pines => -${exponentialDamage} HP (e^${turnNumber})`,
        );
    }

    if (stats.castQueue.length > 0) {
        const spellName = stats.castQueue[0];
        debug(`${username} Casting spell: ${spellName}`);

        const spellFn = spellHandlers[spellName];

        if (spellFn) {
            const result = await spellFn({
                stats,
                monster,
                monsterState,
                currentPlayerHp,
                currentMonsterHp,
                messages,
            });

            currentPlayerHp = result.currentPlayerHp;
            currentMonsterHp = result.currentMonsterHp;
        } else {
            messages.push(
                `\`❓\` The spell "${spellName}" was found but has no effect`,
            );
            debug(`${username} Unknown spell: "${spellName}" has no effect`);
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
        debug(`${username} Fishing monster => skipping skill-based logic.`);

        const baseAttack = stats.attackPower || 0;
        currentMonsterHp = Math.max(currentMonsterHp - baseAttack, 0);

        messages.push(
            `\`⚔️\` You dealt \`${baseAttack.toFixed(
                2,
            )}\` basic damage to the ${monster.name}`,
        );
        debug(`${username} Fishing attack: Dealt ${baseAttack} damage`);

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

    if (monster.mutationType === "Poisonous") {
        const hpLoss = Math.floor(stats.maxHP * 0.1);
        currentPlayerHp = Math.max(
            currentPlayerHp - hpLoss,
            getDeathThreshold(stats),
        );
        messages.push(
            `\`🧬\` The monster is poisonous! You lost \`${hpLoss}\` HP with this attack`,
        );
        debug(
            `${username} Poisonous mutation: Player loses ${hpLoss} HP, new HP: ${currentPlayerHp}`,
        );
    }

    if (skills.has(stats, "Sting")) {
        const stingChance = 0.15;
        if (Math.random() < stingChance) {
            monsterState.stunned = true;

            const healAmount = Math.floor(stats.maxHP * 0.15);
            currentPlayerHp = Math.min(
                currentPlayerHp + healAmount,
                effectiveMaxHp,
            );

            messages.push(
                `\`🦂\` **Sting** activated! You stunned the ${monster.name} and healed yourself for \`${healAmount}\` HP.`,
            );

            debug(
                `${username} Sting activated: Stunned ${monster.name} and healed for ${healAmount} HP.`,
            );
        }
    }

    if (paladinSwapped) {
        messages.push(
            "`🛡️` Paladin skill activated! Your ATK and DEF Value have been swapped",
        );
        debugMultipliers.push("Paladin Swapped (ATK and DEF)");
        debug(`${usernameLog} Paladin => ATK and DEF swapped`);
    }

    if (hasWrath) {
        let wrathMultiplier = 1.5;
        if (isFirstGreatMagic) {
            wrathMultiplier *= 2;
            messages.push(
                "`🎩` The First Great Magic doubles your Wrath effect!",
            );
        }
        attackPower *= wrathMultiplier;
        messages.push(
            `\`💢\` The Wrath skill makes you deal __${(
                wrathMultiplier * 100
            ).toFixed(0)}%__ more damage`,
        );
        debugMultipliers.push(`Wrath (${wrathMultiplier}x)`);
        debug(
            `${usernameLog} Wrath => attackPower * ${wrathMultiplier} = ${attackPower}`,
        );
    }

    if (skills.has(stats, "Pride")) {
        let prideMultiplier = 2;
        if (isFirstGreatMagic) {
            prideMultiplier *= 2;
            messages.push(
                "`🎩` The First Great Magic doubles your Pride effect!",
            );
        }
        attackPower *= prideMultiplier;
        messages.push(
            `\`🏅\` The Pride skill makes you deal __${(
                prideMultiplier * 100
            ).toFixed(0)}%__ more damage`,
        );
        debugMultipliers.push(`Pride (${prideMultiplier}x)`);
        debug(
            `${usernameLog} Pride => attackPower * ${prideMultiplier} = ${attackPower}`,
        );
    }

    if (monsterState.poisoned) {
        const poisonDamage = Math.floor(0.2 * monster.startingHp);
        currentMonsterHp = Math.max(currentMonsterHp - poisonDamage, 0);
        messages.push(
            `\`💚\` Poisoned! The ${monster.name} loses \`${poisonDamage}\` HP`,
        );
        debugMultipliers.push(`Poison Damage (${poisonDamage})`);
        debug(`${usernameLog} Poison => -${poisonDamage} HP to monster`);

        if (currentMonsterHp === 0) {
            monsterState.poisoned = false;
            debug(`${usernameLog} Poison ended => monster HP 0`);
        }
    }

    const hasVigor = skills.has(stats, "Vigor");
    if (hasVigor) {
        const hpPercentage = (currentPlayerHp / stats.maxHP) * 100;
        if (hpPercentage < 25) {
            let vigorMultiplier = 1.5;

            if (isFirstGreatMagic) {
                vigorMultiplier *= 2;
                messages.push(
                    "`🎩` The First Great Magic doubles your Vigor effect!",
                );
            }

            attackPower *= vigorMultiplier;
            messages.push(
                `\`💪\` Vigor skill activated! Your low HP grants you __${(
                    vigorMultiplier * 100
                ).toFixed(0)}%__ more damage`,
            );
            debugMultipliers.push(`Vigor (${vigorMultiplier}x)`);
            debug(
                `${usernameLog} Vigor => x${vigorMultiplier} => ${attackPower}`,
            );
        }
    }

    const { attackPower: baseAttackPower, monsterState: modifiedMonsterState } =
        applyAttackModifiers(
            attackPower,
            stats,
            monster,
            monsterState,
            messages,
        );
    let currentAttackPower = baseAttackPower;

    if (stats.swordStyle === "Guhua Style" && stats.styleGuhua >= 0) {
        const equippedWeapon = weapons[stats.equippedWeapon as WeaponName];
        if (equippedWeapon?.type === "Sword") {
            const swordCount = stats.inventory
                .filter(
                    (item) =>
                        weapons[item.item as WeaponName]?.type === "Sword",
                )
                .reduce((total, item) => total + item.amount, 0);

            if (swordCount > 0) {
                currentAttackPower += swordCount * 2;
                messages.push(
                    `\`⚔️\` Thousand Swords deals \`${swordCount}\` bonus damage`,
                );
                debug(
                    `${username} Thousand Swords => +${swordCount} damage from ${swordCount} swords`,
                );
            }
        }
    }

    if (stats.swordStyle === "Kamisato Art" && stats.styleKamisato >= 0) {
        const equippedWeapon = weapons[stats.equippedWeapon as WeaponName];
        if (equippedWeapon?.type === "Sword") {
            const baseDamage = equippedWeapon.attackPower || 0;
            currentAttackPower += baseDamage;
            messages.push(
                `\`❄️\` Frozen Domain deals \`${baseDamage}\` bonus damage`,
            );
            debug(
                `${username} Frozen Domain => +${baseDamage} damage from weapon base ATK`,
            );
        }
    }

    let critChance = stats.critChance || 0;
    const critValue = stats.critValue || 1;
    const isNobushi = has("Nobushi", monster, true);
    if (isNobushi && !monsterState.poisoned) {
        critChance = 0;
        messages.push(
            `\`👹\` The Ninja's Code prevents you from landing a critical hit`,
        );
        debug(`${usernameLog} Nobushi trait: Crit disabled`);
    }
    const { isCrit, multiplier } = calculateCriticalHit(critChance, critValue);
    if (isCrit) {
        debugMultipliers.push(`Critical Hit (${multiplier}x)`);
        debug(`${usernameLog} CRIT => x${multiplier}`);
    }
    currentAttackPower *= multiplier;

    if (currentPlayerHp > stats.maxHP) {
        currentAttackPower *= 0.5;
        messages.push(`\`💜\` Overhealed! Your damage is halved`);
        debugMultipliers.push("Overheal (0.5x)");
        debug(`${usernameLog} Overheal => x0.5 => ${currentAttackPower}`);
    }

    const defenseResult = checkMonsterDefenses(
        currentAttackPower,
        stats,
        monster,
        modifiedMonsterState,
        messages,
    );
    const {
        attackPower: finalAttackPower,
        attackMissed,
        monsterDefended,
        damageReduced,
        monsterState: defenseMonsterState,
    } = defenseResult;

    if (attackMissed) {
        debug(`${usernameLog} Attack missed entirely`);
        return {
            currentMonsterHp,
            currentPlayerHp,
            vigilanceUsed,
            monsterState: defenseMonsterState,
        };
    }

    const vigilanceLevelData = getUserSkillLevelData(stats, "Vigilance");
    if (vigilanceLevelData && !hasFreedomSworn && !vigilanceUsed) {
        if (!has(["Fatui", "Wayob"], monster, true)) {
            const levelData = vigilanceLevelData.levelData || {};
            const secondAttackPercentage =
                levelData.secondAttackPercentage || 0;

            let vigilanceAttackPower =
                finalAttackPower * secondAttackPercentage;
            if (isFirstGreatMagic) {
                vigilanceAttackPower *= 2;
                messages.push(
                    "`🎩` The First Great Magic doubles your Vigilance damage!",
                );
            }

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
        } else {
            messages.push("`⚠️` Vigilance skill does not work on this monster");
        }
    }

    currentMonsterHp -= finalAttackPower;
    debugMultipliers.push(`Final Attack Power (${finalAttackPower})`);
    sendDamageMessage(
        finalAttackPower,
        monster.name,
        isCrit,
        monsterDefended,
        damageReduced,
        messages,
    );
    debug(
        `${usernameLog} Final Attack => ${finalAttackPower}, multipliers= [${debugMultipliers.join(
            ", ",
        )}]`,
    );

    if (has("Mirror Maiden", monster)) {
        currentPlayerHp = Math.max(
            currentPlayerHp - finalAttackPower,
            getDeathThreshold(stats),
        );
        messages.push(
            `\`📩\` Mirror Maiden reflects \`${finalAttackPower.toFixed(
                2,
            )}\` damage back to you`,
        );
        debug(
            `${usernameLog} Mirror Maiden reflection: -${finalAttackPower} HP to player`,
        );
    }

    if (stats.swordStyle === "Guhua Style" && stats.styleGuhua >= 50) {
        const equippedWeapon = weapons[stats.equippedWeapon as WeaponName];
        if (equippedWeapon?.type === "Sword") {
            const healAmount = Math.floor(finalAttackPower / 10);
            if (healAmount > 0) {
                currentPlayerHp = Math.min(
                    currentPlayerHp + healAmount,
                    effectiveMaxHp,
                );
                messages.push(
                    `\`💚\` Ambient Healing activated! You healed \`${healAmount}\` HP`,
                );
                debug(`${usernameLog} Ambient Healing => +${healAmount} HP`);
            }
        }
    }

    const kindleLevelData = getUserSkillLevelData(stats, "Kindle");
    if (kindleLevelData) {
        if (
            !isFishingMonster(monster) &&
            !hasFreedomSworn &&
            !has(["Human", "Wayob"], monster, true)
        ) {
            const levelData = kindleLevelData.levelData || {};
            const damageBonus = levelData.damageBonus || 0;

            let kindleBonusDamage = stats.maxHP * damageBonus;
            if (isFirstGreatMagic) {
                kindleBonusDamage *= 2;
                messages.push(
                    "`🎩` The First Great Magic doubles your Kindle damage!",
                );
            }

            currentMonsterHp = Math.max(
                currentMonsterHp - kindleBonusDamage,
                0,
            );

            messages.push(
                `\`🔥\` The Kindle skill activates and deals an extra \`${kindleBonusDamage.toFixed(
                    2,
                )}\` damage`,
            );
            debugMultipliers.push(
                `Kindle (${(damageBonus * 100).toFixed(0)}%)`,
            );
        } else {
            messages.push("`⚠️` Kindle skill does not work on this monster");
        }
    }

    const spiceLevelData = getUserSkillLevelData(stats, "Spice");
    if (spiceLevelData && currentMonsterHp > 0) {
        if (
            !isFishingMonster(monster) &&
            !hasFreedomSworn &&
            !has("Human", monster, true)
        ) {
            const levelData = spiceLevelData.levelData || {};
            const damageBonus = levelData.damageBonus || 0;

            let spiceDamageBonus = currentMonsterHp * damageBonus;
            if (isFirstGreatMagic) {
                spiceDamageBonus *= 2;
                messages.push(
                    "`🎩` The First Great Magic doubles your Spice damage!",
                );
            }

            currentMonsterHp = Math.max(currentMonsterHp - spiceDamageBonus, 0);

            messages.push(
                `\`🌶️\` The Spice skill activates and deals an extra \`${spiceDamageBonus.toFixed(
                    2,
                )}\` damage`,
            );
            debugMultipliers.push(`Spice (${(damageBonus * 100).toFixed(0)}%)`);
        } else {
            messages.push("`⚠️` Spice skill does not work on this monster");
        }
    }

    if (
        has("Machine", monster, true) &&
        currentMonsterHp <= 0 &&
        !modifiedMonsterState.shieldUsed
    ) {
        currentMonsterHp = 1;
        modifiedMonsterState.shieldUsed = true;
        messages.push(
            "`⛔` The Machine's Shield prevents it from dying this turn!",
        );
        debug(`${usernameLog} Machine => shield at 1 HP`);
    }

    const deathThreshold = getDeathThreshold(stats);
    if (currentPlayerHp <= deathThreshold) {
        currentPlayerHp = deathThreshold;
        debug(
            `${usernameLog} Player HP below threshold => set to ${deathThreshold}`,
        );
    }

    return {
        currentMonsterHp,
        currentPlayerHp,
        vigilanceUsed,
        monsterState: defenseMonsterState,
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
        debug(`${username} ${monster.name} stunned => skip monster attack`);
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
            )}\` damage to you`,
        );
        debug(`${username} Fishing monster => -${monsterDamage} HP to player`);

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
        debug(`${username} ${monster.name} +${regenAmount} HP (Geo)`);
    }

    let monsterDamage = getRandomValue(
        monsterStats.minDamage,
        monsterStats.maxDamage,
    );
    debug(`${username} ${monster.name} base damage => ${monsterDamage}`);

    switch (monster.mutationType) {
        case "Bloodthirsty":
            monsterDamage *= 2;
            debug(`${username} Bloodthirsty => x2 => ${monsterDamage}`);
            break;
        case "Strange":
            monsterDamage *= 1.5;
            debug(`${username} Strange => x1.5 => ${monsterDamage}`);
            break;
        case "Infected":
            debug(`${username} Infected => no direct damage change`);
            break;
        case "Demonic":
            monsterDamage *= 2;
            debug(`${username} Demonic => x2 => ${monsterDamage}`);
            break;
        case "Hard":
            debug(`${username} Hard => HP doubled at start`);
            break;
    }

    if (turnNumber > 50) {
        if (!monsterState.isEnraged) {
            monsterState.isEnraged = true;
            monsterDamage *= 2;
            messages.push(`\`🐲\` The ${monster.name} became **enraged**!`);
            debug(`${username} enrage => x2 => ${monsterDamage}`);
        } else {
            monsterDamage *= 2;
            debug(
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
        debug(
            `${username} Dendro => x${monsterState.dendroAttackMultiplier.toFixed(
                2,
            )} => ${monsterDamage}`,
        );
    }

    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;
    let monsterCritChance = monster.critChance || 0;
    let monsterCritValue = monster.critValue || 1;
    if (equippedWeaponName?.includes("Absolution")) {
        monsterCritChance = 0;
        monsterCritValue = 1;
        messages.push(
            "`⚜️` Your Absolution negates the monster's critical hits",
        );
        debug(`${username} Absolution => monster crit disabled`);
    }

    const { isCrit, multiplier } = calculateCriticalHit(
        monsterCritChance,
        monsterCritValue,
        stats,
        currentPlayerHp,
        effectiveMaxHp,
    );
    if (isCrit) {
        debug(`${username} ${monster.name} crit => x${multiplier}`);
    }
    monsterDamage *= multiplier;

    if (hasCrystallize && !isFishingMonster(monster)) {
        const monsterTurn = Math.ceil(turnNumber / 2);
        monsterDamage = applyCrystallize(
            monsterDamage,
            monsterTurn,
            monster,
            username,
            messages,
            stats,
        );
    }
    if (hasFatigue && !isFishingMonster(monster)) {
        const monsterTurn = Math.ceil(turnNumber / 2);
        monsterDamage = applyFatigue(
            monsterDamage,
            monsterTurn,
            monster,
            username,
            messages,
            stats,
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
            debug(
                `${username} defends => -${damageReduced} => ${monsterDamage}`,
            );
        }
    } else {
        messages.push(`\`⚙️\` The ${monster.name} ignores your defenses`);
        debug(`${username} Machine => ignoring defenses`);
    }

    const hasVortexVanquisher =
        equippedWeaponName?.includes("Vortex Vanquisher");
    const damageReductionFactor = hasVortexVanquisher ? 0.5 : 1;
    if (hasVortexVanquisher) {
        messages.push(
            "`🌀` Vortex Vanquisher reduces your damage taken by __-50%__",
        );
        debug(`${username} Vortex => monsterDamage * 0.5`);
    }

    monsterDamage = applyElementalEffects(
        monster,
        monsterDamage,
        monsterState,
        stats,
        messages,
        damageReductionFactor,
    );

    let finalMonsterDamage = monsterDamage * damageReductionFactor;

    const absorptionSkill = getUserSkillLevelData(stats, "Absorption");
    if (absorptionSkill) {
        const levelData = absorptionSkill.levelData || {};
        const triggerChance = levelData.triggerChance || 0;
        const triggered = Math.random() < triggerChance;

        if (triggered) {
            if (absorptionSkill.level < 3) {
                const halfDamage = finalMonsterDamage / 2;

                const newHp = stats.hp + halfDamage;
                stats.hp = Math.min(newHp, effectiveMaxHp);

                finalMonsterDamage = halfDamage;
                messages.push(
                    `\`♨️\` Absorption negated \`${halfDamage.toFixed(
                        2,
                    )}\` damage, and healed \`${halfDamage.toFixed(2)}\` HP`,
                );
            } else {
                const absorbed = finalMonsterDamage;

                const newHp = stats.hp + absorbed;
                stats.hp = Math.min(newHp, effectiveMaxHp);

                finalMonsterDamage = 0;
                messages.push(
                    `\`♨️\` Absorption negated \`${absorbed.toFixed(
                        2,
                    )}\` damage, and healed \`${absorbed.toFixed(2)}\` HP`,
                );
            }
        }
    }

    const hasBackstep = skills.has(stats, "Backstep");
    const hasParry = skills.has(stats, "Parry");
    const hasPerfectParry = skills.has(stats, "Perfect Parry");

    const evasionEffect = stats.activeEffects.find(
        (eff) => eff.name === "Evasion" && eff.remainingUses > 0,
    );

    if (evasionEffect && Math.random() < evasionEffect.effectValue) {
        messages.push("`💨` You dodged the attack completely with Evasion");
        debug(`${username} Evasion => 0 dmg`);
        finalMonsterDamage = 0;

        evasionEffect.remainingUses -= 1;

        if (evasionEffect.remainingUses <= 0) {
            stats.activeEffects = stats.activeEffects.filter(
                (eff) => eff !== evasionEffect,
            );
            messages.push("`💨` Your Evasion effect has ended.");
            debug(
                `${username} Evasion effect ended => removed from activeEffects`,
            );
        }
    } else if (hasBackstep && Math.random() < 0.25) {
        messages.push("`💨` You dodged the attack completely with Backstep");
        debug(`${username} Backstep => 0 dmg`);
        finalMonsterDamage = 0;
    } else if (hasPerfectParry && Math.random() < 0.2) {
        const parried = finalMonsterDamage;
        finalMonsterDamage = 0;
        currentMonsterHp -= parried;
        messages.push(
            `\`🎆\` Perfect Parry skill activated! You reflected \`${parried.toFixed(
                2,
            )}\` damage back to the ${monster.name}`,
        );
        debug(
            `${username} Perfect Parry => monster HP -${parried}, finalMonsterDamage => ${finalMonsterDamage}`,
        );
    } else if (hasParry && Math.random() < 0.2) {
        const parried = finalMonsterDamage * 0.5;
        finalMonsterDamage *= 0.5;
        currentMonsterHp -= parried;
        messages.push(
            `\`🎆\` Parry skill activated! You reflected \`${parried.toFixed(
                2,
            )}\` damage back to the ${monster.name}`,
        );
        debug(
            `${username} Parry => monster HP -${parried}, finalMonsterDamage => ${finalMonsterDamage}`,
        );
    }

    if (skills.has(stats, "Iron Skin")) {
        const resisted = finalMonsterDamage * 0.25;
        finalMonsterDamage *= 0.75;
        messages.push(
            `\`💮\` Iron Skin activated! You resisted \`${resisted.toFixed(
                2,
            )}\` damage`,
        );
        debug(
            `${username} Iron Skin => resisted ${resisted} damage, finalMonsterDamage => ${finalMonsterDamage}`,
        );
    }

    if (skills.has(stats, "Fear")) {
        const monsterStats = monster.getStatsForadventureRank(
            stats.adventureRank,
        );
        if (!monsterStats) {
            throw new Error(`Stats not found for monster: ${monster.name}`);
        }
        const minWorldLevel = monster.minadventurerank || 0;

        if (stats.adventureRank >= minWorldLevel + 5) {
            if (Math.random() < 0.5) {
                messages.push(
                    "`👁️` Fear skill activated! The monster missed their attack",
                );
                debug(`${username} Fear => monster attack missed`);
                finalMonsterDamage = 0;
            }
        } else {
            messages.push(
                "`⚠️` The monster is not afraid of you! Your AR is too low for this monster to be afraid.",
            );
            debug(`${username} Fear => monster not afraid (AR too low)`);
        }
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
            debug(`${username} Resistance effect expired`);
        }
        debug(
            `${username} Resistance => -${resistanceReduced} => ${finalMonsterDamage}`,
        );
    }

    const leftover = applyShieldThenHp(stats, finalMonsterDamage);
    currentPlayerHp -= leftover;
    debug(
        `${username} took ${finalMonsterDamage} total damage (${leftover} to HP) from ${monster.name}. Shield now = ${stats.shield}`,
    );

    currentPlayerHp = applyLeechDrain(
        stats,
        monster,
        currentPlayerHp,
        currentMonsterHp,
        effectiveMaxHp,
        messages,
    );

    currentPlayerHp = Math.min(currentPlayerHp, effectiveMaxHp);
    debug(`${username} HP after => ${currentPlayerHp}`);

    const deathThreshold = getDeathThreshold(stats);
    if (currentPlayerHp <= deathThreshold) {
        if (skills.has(stats, "Fortress") && !monsterState.fortressUsed) {
            currentPlayerHp = 1;
            monsterState.fortressUsed = true;
            messages.push(
                "`💀` Fortress skill activated! You should've died this turn",
            );
            debug(`${username} Fortress => set HP = 1`);
        } else {
            currentPlayerHp = deathThreshold;
            debug(`${username} HP below threshold => ${deathThreshold}`);
        }
    }

    if (monster.mutationType === "Demonic") {
        const stolen = Math.floor(currentPlayerHp * 0.2);

        const deathThreshold = getDeathThreshold(stats);
        currentPlayerHp = Math.max(currentPlayerHp - stolen, deathThreshold);

        currentMonsterHp = Math.min(
            currentMonsterHp + stolen,
            monster.startingHp,
        );

        messages.push(
            `\`👿\` The demonic ${monster.name} steals \`${stolen}\` HP from you!`,
        );
        debug(
            `${username} Demonic => player HP -${stolen}, monster HP +${stolen}`,
        );
    }

    await updateUserStats(stats.userId, {
        hp: { set: currentPlayerHp },
        shield: { set: stats.shield },
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
    debug(
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

    const hasImmunity = stats.activeEffects.some(
        (effect) => effect.name === "Immunity" && effect.remainingUses > 0,
    );

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
        debug(
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
        debug(
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
        debug(
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

        if (equippedWeaponName?.includes("Crimson Moon's Semblance")) {
            const souls = stats.souls || 0;
            const soulBonus = souls;
            attackPower += soulBonus;
            messages.push(
                `\`🌙\` Crimson Moon's Semblance adds \`${soulBonus.toFixed(
                    2,
                )}\` damage from \`${souls}\` **SOULS**`,
            );
            debugMultipliers.push(`Soul Bonus (+${soulBonus})`);
            debug(
                `${username} Soul Bonus: +${soulBonus} damage from ${souls} souls`,
            );
        }

        const effectiveGroups = make.array<MonsterGroup>(
            weaponAdvantages[weaponType] || [],
        );

        if (has(effectiveGroups, monster, true)) {
            attackPower *= 1.1;
            messages.push(
                `\`⚔️\` **${weaponType}** advantage! You deal __110%__ more DMG to **${monster.group}**`,
            );
            debugMultipliers.push(`${weaponType} Advantage (1.1x)`);
            debug(
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
                  ).toFixed(0)}%__ damage`
                : `\`➰\` Mastery Level ${appliedMasteryLevel} activated`;
            messages.push(masteryMessage);
            debugMultipliers.push(
                `Mastery Level ${appliedMasteryLevel} (${(
                    applicableMultiplier * 100
                ).toFixed(0)}%)`,
            );
            debug(
                `${username} Mastery Level ${appliedMasteryLevel} effect: ${weaponType} damage multiplied by ${applicableMultiplier} to ${attackPower}`,
            );
        }

        if (equippedWeaponName?.includes("Wolf's Gravestone")) {
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
                debug(
                    `${username} Wolf's Gravestone effect: Damage multiplied by ${damageMultiplier} to ${attackPower}`,
                );
            }
        }

        if (
            equippedWeaponName &&
            equippedWeaponName.includes("Ha­ran Gep­paku Fu­tsu")
        ) {
            const unassignedPoints = Math.max(
                (stats.alchemyProgress ?? 0) - (stats.totalAssigned ?? 0),
                0,
            );

            if (unassignedPoints > 0) {
                const damageMultiplier = 1 + unassignedPoints / 100;
                attackPower *= damageMultiplier;

                messages.push(
                    `\`🌕\` Ha­ran Gep­paku Fu­tsu effect! You deal __${(
                        damageMultiplier * 100
                    ).toFixed(
                        0,
                    )}%__ more damage for having **${unassignedPoints}** unassigned alchemy points`,
                );
                debugMultipliers.push(
                    `Ha­ran Gep­paku Fu­tsu +${unassignedPoints}% DMG`,
                );
                debug(
                    `${username} Ha­ran Gep­paku Fu­tsu effect => +${unassignedPoints}% => ${attackPower}`,
                );
            }
        }
    }

    if (monster.mutationType === "Demonic" && !hasImmunity) {
        attackPower *= 0.6;
        messages.push(
            "`🎭` A sense of pressure reduces your damage by __40%__",
        );
        debugMultipliers.push("Demonic Pressure (0.6x)");
        debug(`${username} Demonic => Attack Power * 0.6 = ${attackPower}`);
    } else if (monster.mutationType === "Demonic" && hasImmunity) {
        messages.push(
            "`✨` Your Immunity spell protects you from the demonic pressure",
        );
        debug(`${username} Immunity active => Demonic pressure negated`);
    }

    if (monster.defValue && monster.defValue > 1000) {
        attackPower *= 0.8;
        messages.push(
            "`🌻` The monster's high defense reduces your damage by __20%__",
        );
        debugMultipliers.push("High Defense (0.8x)");
        debug(
            `${username} High Defense => Attack Power * 0.8 = ${attackPower}`,
        );
    }

    debug(
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

    if (monster.dodgeChance && Math.random() < monster.dodgeChance / 100) {
        attackMissed = true;
        messages.push(`\`🔄\` The ${monster.name} dodged your attack!`);
        debug(
            `${username} Dodge chance: ${monster.name} dodged the attack with ${monster.dodgeChance}% dodge chance`,
        );
    }

    if (
        has("Agent", monster) &&
        !monsterState.poisoned &&
        !monsterState.vanishedUsed
    ) {
        attackMissed = true;
        monsterState.vanishedUsed = true;
        messages.push(
            `\`👤\` The ${monster.name} has vanished, dodging your attack`,
        );
        debug(
            `${username} Agent trait: ${monster.name} has vanished and dodged the attack`,
        );
    }

    if (
        monster.element === MonsterElement.Electro &&
        Math.random() < 0.25 &&
        equippedWeaponName?.includes("Everlasting Moonglow")
    ) {
        messages.push(
            `\`💫\` The ${monster.name} stunned you! You missed your attack`,
        );
        attackMissed = true;
        debug(
            `${username} Electro element: ${monster.name} stunned the player, attack missed`,
        );
    }

    if (
        monster.element === MonsterElement.Anemo &&
        Math.random() < 0.25 &&
        !equippedWeaponName?.includes("Everlasting Moonglow")
    ) {
        messages.push(
            `\`💨\` The ${monster.name} dodged your attack with its Anemo agility`,
        );
        attackMissed = true;
        debug(
            `${username} Anemo element: ${monster.name} dodged the attack with agility`,
        );
    }

    if (has(["Boss"], monster, true) && Math.random() < 0.25) {
        messages.push(
            `\`👑\` The ${monster.name} dodged your attack with its superior agility`,
        );
        attackMissed = true;
        debug(
            `${username} Boss trait: ${monster.name} dodged the attack with superior agility`,
        );
    }

    if (has(["Fatui"], monster, true) && Math.random() < 0.25) {
        monsterState.displaced = true;
        messages.push(
            `\`〽️\` The ${monster.name} displaced you! You will deal __80%__ less damage next turn`,
        );
        debug(
            `${username} Fatui trait: ${monster.name} displaced the player, attack power will be reduced next turn`,
        );
    }

    let monsterDefChance = monster.defChance || 0;
    const monsterDefValue = monster.defValue || 0;

    if (equippedWeaponName?.includes("Calamity Queller")) {
        monsterDefChance = 0;
        messages.push(
            `\`🌊\` **Calamity Queller** prevents the ${monster.name} from defending`,
        );
        debug(
            `${username} Calamity Queller equipped => monster's defChance = 0`,
        );
    }

    const monsterDefendedCheck = Math.random() * 100 < monsterDefChance;
    if (monsterDefendedCheck) {
        const initialAttackPower = attackPower;
        attackPower = (100 * attackPower) / (monsterDefValue + 25);
        damageReduced = initialAttackPower - attackPower;
        monsterDefended = true;
        debug(
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
    stats?: UserStats,
    currentHp?: number,
    maxHp?: number,
): { isCrit: boolean; multiplier: number } {
    if (
        stats &&
        currentHp &&
        maxHp &&
        stats.swordStyle === "Kamisato Art" &&
        stats.styleKamisato >= 50
    ) {
        const equippedWeapon = weapons[stats.equippedWeapon as WeaponName];
        if (equippedWeapon?.type === "Sword") {
            if (currentHp / maxHp > 0.8) {
                return { isCrit: true, multiplier: critValue };
            }
        }
    }

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

export function applyShieldThenHp(
    stats: UserStats,
    incomingDamage: number,
): number {
    let leftover = incomingDamage;

    if (stats.shield > 0) {
        if (stats.shield >= leftover) {
            stats.shield -= leftover;
            leftover = 0;
        } else {
            leftover -= stats.shield;
            stats.shield = 0;
        }
    }
    return leftover;
}
