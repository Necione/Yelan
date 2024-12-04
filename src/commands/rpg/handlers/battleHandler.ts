import { getRandomValue, is, make } from "@elara-services/utils";
import type { Prisma, UserStats } from "@prisma/client";
import { skills } from "../../../plugins/other/utils";
import { updateUserStats } from "../../../services";
import { weaponAdvantages, type Monster } from "../../../utils/hunt";
import { masteryBenefits } from "../../../utils/masteryData";
import { calculateMasteryLevel } from "../../../utils/masteryHelper";
import { MonsterGroup } from "../../../utils/monsterHelper";
import type { WeaponName, WeaponType } from "../../../utils/rpgitems/weapons";
import { weapons } from "../../../utils/rpgitems/weapons";
import { getUserSkillLevelData } from "../../../utils/skillsData";

export type MonsterState = {
    displaced: boolean;
    vanishedUsed: boolean;
    stunned?: boolean;
    poisoned?: boolean;
    shieldUsed?: boolean;
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
    if (stats.castQueue.length > 0) {
        const spellName = stats.castQueue[0];

        switch (spellName) {
            case "Heal": {
                const healAmount = Math.floor(0.15 * stats.maxHP);
                currentPlayerHp = Math.min(
                    currentPlayerHp + healAmount,
                    stats.maxHP,
                );
                messages.push(
                    `\`✨\` Heal spell casted! Restored \`${healAmount} HP\`.`,
                );
                break;
            }

            case "Fury": {
                stats.attackPower *= 2;
                messages.push(
                    `\`⚡\` Fury spell casted! Your next attack will deal double damage.`,
                );
                break;
            }

            case "Burn": {
                const burnDamage = Math.floor(0.5 * monster.currentHp);
                currentMonsterHp = Math.max(currentMonsterHp - burnDamage, 0);
                messages.push(
                    `\`🔥\` Burn spell casted! Dealt \`${burnDamage} damage\` to the ${monster.name}.`,
                );
                break;
            }

            case "Cripple": {
                const crippleDamage = Math.floor(0.2 * monster.currentHp);
                currentMonsterHp = Math.max(
                    currentMonsterHp - crippleDamage,
                    0,
                );
                messages.push(
                    `\`❄️\` Cripple spell casted! Dealt \`${crippleDamage} damage\` to the ${monster.name}.`,
                );
                break;
            }

            case "Stun": {
                monsterState.stunned = true;
                messages.push(
                    `\`💫\` Stun spell casted! The enemy is stunned and will miss its next attack.`,
                );
                break;
            }

            case "Poison": {
                if (!monsterState.poisoned) {
                    monsterState.poisoned = true;
                    messages.push(
                        `\`💚\` Poison spell casted! The ${monster.name} is poisoned and will lose 10% of its HP each turn.`,
                    );
                } else {
                    messages.push(
                        `\`💚\` Poison spell casted again! The ${monster.name} is already poisoned.`,
                    );
                }
                break;
            }

            default:
                messages.push(
                    `\`❓\` The spell "${spellName}" was found but has no effect.`,
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

    // eslint-disable-next-line prefer-const
    let { paladinSwapped, attackPower } = getEffectiveStats(stats);

    if (paladinSwapped) {
        messages.push(
            `\`🛡️\` Paladin skill activated! Your ATK and DEF Value have been swapped.`,
        );
    }

    if (hasWrath) {
        attackPower *= 1.5;
        messages.push(
            `\`💢\` Wrath skill activated! You deal 150% more damage.`,
        );
    }

    if (monsterState.poisoned) {
        const poisonDamage = Math.floor(0.2 * monster.currentHp);
        currentMonsterHp = Math.max(currentMonsterHp - poisonDamage, 0);
        messages.push(
            `\`💚\` Poisoned! The ${monster.name} loses \`${poisonDamage} HP\` due to poison.`,
        );

        if (currentMonsterHp === 0) {
            monsterState.poisoned = false;
        }
    }

    const hasVigor = skills.has(stats, "Vigor");
    if (hasVigor) {
        const hpPercentage = (currentPlayerHp / stats.maxHP) * 100;
        if (hpPercentage < 25) {
            attackPower *= 1.5;
            messages.push(
                `\`💪\` Vigor skill activated! Your low HP grants you 150% more damage.`,
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
            `\`👹\` The Ninja's Code prevents you from landing a critical hit.`,
        );
    }

    const { isCrit, multiplier } = calculateCriticalHit(critChance, critValue);
    attackPower *= multiplier;

    if (currentPlayerHp > stats.maxHP) {
        attackPower *= 0.5;
        messages.push(
            `\`💜\` You are poisoned due to **OVERHEAL**, and your damage has been halved.`,
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
            )}\` damage to the ${monster.name} ✨ (Vigilance).`,
        );
    }
    currentMonsterHp -= attackPower;

    sendDamageMessage(
        attackPower,
        monster.name,
        isCrit,
        monsterDefended,
        damageReduced,
        messages,
    );

    const kindleLevelData = getUserSkillLevelData(stats, "Kindle");

    if (kindleLevelData) {
        const levelData = kindleLevelData.levelData || {};
        const damageBonus = levelData.damageBonus || 0;

        const kindleBonusDamage = stats.maxHP * damageBonus;
        currentMonsterHp -= kindleBonusDamage;

        messages.push(
            `\`🔥\` You dealt an additional \`${kindleBonusDamage.toFixed(
                2,
            )}\` bonus damage with the Kindle skill!`,
        );
    }

    if (
        has("Machine", monster, true) &&
        currentMonsterHp <= 0 &&
        !monsterState.shieldUsed
    ) {
        currentMonsterHp = 1;
        monsterState.shieldUsed = true;
        messages.push("`⛔` The Machine's Shield prevents it from dying.");
    }

    const deathThreshold = getDeathThreshold(stats);
    if (currentPlayerHp <= deathThreshold) {
        currentPlayerHp = deathThreshold;
    }

    return { currentMonsterHp, currentPlayerHp, vigilanceUsed, monsterState };
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
): Promise<{
    currentPlayerHp: number;
    currentMonsterHp: number;
}> {
    if (monsterState.stunned) {
        messages.push(
            `\`💫\` The ${monster.name} is stunned and couldn't attack this turn!`,
        );
        monsterState.stunned = false;
        return { currentPlayerHp, currentMonsterHp };
    }

    const monsterStats = monster.getStatsForWorldLevel(stats.worldLevel);
    if (!monsterStats) {
        throw new Error(`Stats not found for monster: ${monster.name}`);
    }

    let monsterDamage = getRandomValue(
        monsterStats.minDamage,
        monsterStats.maxDamage,
    );

    if (monster.isMutated) {
        monsterDamage *= 1.2;
    }

    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;

    let monsterCritChance = monster.critChance || 0;
    let monsterCritValue = monster.critValue || 1;

    if (equippedWeaponName && equippedWeaponName.includes("Absolution")) {
        monsterCritChance = 0;
        monsterCritValue = 1;
        messages.push(
            `\`⚜️\` Your **Absolution** prevents enemies from landing Critical Hits on you.`,
        );
    }

    const { isCrit, multiplier } = calculateCriticalHit(
        monsterCritChance,
        monsterCritValue,
    );
    monsterDamage *= multiplier;

    if (hasCrystallize) {
        const monsterTurn = Math.ceil(turnNumber / 2);

        let damageMultiplier: number;
        let effectDescription = "";

        if (monsterTurn <= 6) {
            const reductionPercent = 25 - Math.floor(monsterTurn - 1) * 5;
            damageMultiplier = 1 - reductionPercent / 100;

            monsterDamage *= damageMultiplier;

            effectDescription = `\`🧊\` Crystallize reduces the ${monster.name}'s damage by ${reductionPercent}%.`;
        } else {
            const increasePercent = (monsterTurn - 6) * 5;
            damageMultiplier = 1 + increasePercent / 100;

            monsterDamage *= damageMultiplier;

            effectDescription = `\`🧊\` Crystallize increases the ${monster.name}'s damage by ${increasePercent}%.`;
        }

        messages.push(effectDescription);
    }

    if (hasFatigue) {
        const monsterTurn = Math.ceil(turnNumber / 2);

        let damageMultiplier: number;
        let effectDescription = "";

        const percentChange = 50 - (monsterTurn - 1) * 10;

        if (percentChange >= 0) {
            damageMultiplier = 1 + percentChange / 100;
            effectDescription = `\`🐌\` Fatigue increases the ${monster.name}'s damage by ${percentChange}%.`;
        } else {
            damageMultiplier = 1 + percentChange / 100;
            effectDescription = `\`🐌\` Fatigue reduces the ${
                monster.name
            }'s damage by ${Math.abs(percentChange)}%.`;
        }

        monsterDamage *= damageMultiplier;
        messages.push(effectDescription);
    }

    const { defValue } = getEffectiveStats(stats);

    const defChance = stats.defChance || 0;
    let defended = false;
    let damageReduced = 0;

    if (monster.group !== "Machine") {
        defended = Math.random() * 100 < defChance;

        if (defended) {
            const initialMonsterDamage = monsterDamage;
            monsterDamage = (100 * monsterDamage) / (defValue + 100);
            damageReduced = initialMonsterDamage - monsterDamage;
        }
    } else {
        messages.push(
            `\`⚙️\` The ${monster.name} ignores your defenses and deals **TRUE DAMAGE**.`,
        );
    }

    const hasVortexVanquisher =
        equippedWeaponName && equippedWeaponName.includes("Vortex Vanquisher");

    const damageReductionFactor = hasVortexVanquisher ? 0.75 : 1;
    if (hasVortexVanquisher) {
        messages.push(
            `\`🌀\` **Vortex Vanquisher** has reduced all damage taken by 25%.`,
        );
    }

    if (has(["Pyro", "Flames"], monster)) {
        const burnDamage = Math.ceil(
            stats.maxHP * (0.03 + 0.01 * Math.floor(stats.worldLevel / 2)),
        );
        const reducedBurnDamage = burnDamage * damageReductionFactor;
        currentPlayerHp -= reducedBurnDamage;
        messages.push(
            `\`🔥\` The ${monster.name} inflicted Burn! You took \`${reducedBurnDamage}\` Burn damage.`,
        );
    }

    if (has(["Cryo", "Frost"], monster) && Math.random() < 0.5) {
        const crippleDamage = Math.ceil(
            stats.maxHP * (0.05 + 0.01 * Math.floor(stats.worldLevel / 2)),
        );

        const reducedCrippleDamage = crippleDamage * damageReductionFactor;
        currentPlayerHp -= reducedCrippleDamage;
        messages.push(
            `\`❄️\` The ${monster.name} inflicted Cripple! You took \`${reducedCrippleDamage}\` Cripple damage.`,
        );
    }

    let reducedMonsterDamage = monsterDamage * damageReductionFactor;

    const hasBackstep = skills.has(stats, "Backstep");
    const hasParry = skills.has(stats, "Parry");

    if (hasBackstep && Math.random() < 0.25) {
        messages.push(
            `\`💨\` Backstep skill activated! You dodged the attack completely.`,
        );
        reducedMonsterDamage = 0;
    } else {
        if (hasParry && Math.random() < 0.2) {
            const parriedDamage = reducedMonsterDamage * 0.5;
            reducedMonsterDamage *= 0.5;
            currentMonsterHp -= parriedDamage;
            messages.push(
                `\`🛡️\` Parry skill activated! You parried 50% of the incoming damage (\`${parriedDamage.toFixed(
                    2,
                )}\`), dealing it back to the ${monster.name}.`,
            );
        }
    }

    currentPlayerHp -= reducedMonsterDamage;

    const deathThreshold = getDeathThreshold(stats);
    if (currentPlayerHp < deathThreshold) {
        currentPlayerHp = deathThreshold;
    }

    const leechLevelData = getUserSkillLevelData(stats, "Leech");

    if (leechLevelData) {
        const levelData = leechLevelData.levelData || {};

        const lifestealPercentage = levelData.lifestealPercentage || 0;
        const triggerChance = levelData.triggerChance || 0;

        const leechTriggered = Math.random() < triggerChance;

        if (leechTriggered) {
            const healAmount = Math.ceil(
                monsterStats.maxHp * lifestealPercentage,
            );
            currentPlayerHp = Math.min(
                currentPlayerHp + healAmount,
                stats.maxHP,
            );
            messages.push(
                `\`💖\` Leech skill activated! You healed \`${healAmount}\` HP from the ${monster.name}.`,
            );
        }
    }

    currentPlayerHp = Math.min(currentPlayerHp, stats.maxHP);
    await updateUserStats(stats.userId, { hp: { set: currentPlayerHp } });

    let critText = "";
    if (
        isCrit &&
        (!equippedWeaponName || !equippedWeaponName.includes("Absolution"))
    ) {
        critText = " 💢 (Critical Hit!)";
    }

    let defendText = "";
    if (defended && damageReduced > 0) {
        defendText = ` 🛡️ (Defended ${damageReduced.toFixed(2)})`;
    }

    const finalDamageDealt = hasVortexVanquisher
        ? reducedMonsterDamage
        : monsterDamage;

    messages.push(
        `\`⚔️\` The ${monster.name} dealt \`${finalDamageDealt.toFixed(
            2,
        )}\` damage to you${defendText}${critText}.`,
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
    const hasBackstab = skills.has(stats, "Backstab");

    const isHumanOrFatui = has(
        [MonsterGroup.Human, MonsterGroup.Fatui, MonsterGroup.Nobushi],
        monster,
        true,
    );

    if (hasBackstab && isHumanOrFatui) {
        attackPower *= 1.5;
        messages.push(
            `\`🗡️\` Backstab skill activated! You deal 150% more DMG!`,
        );
    }

    if (monsterState.displaced) {
        attackPower *= 0.2;
        monsterState.displaced = false;
        messages.push(
            `\`〽️\` You are displaced! Your attack power is reduced by 80%.`,
        );
    }

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
                `\`⚔️\` **${weaponType}** advantage! You deal 110% more DMG to **${monster.group}**.`,
            );
        }

        const masteryField = `mastery${weaponType}` as keyof UserStats;
        const masteryPointsRaw = stats[masteryField];
        const masteryPoints = is.number(masteryPointsRaw)
            ? masteryPointsRaw
            : 0;

        const { numericLevel } = calculateMasteryLevel(masteryPoints);

        const masteryBenefit = masteryBenefits[weaponType]?.[numericLevel];
        if (masteryBenefit?.description) {
            const damageMultiplierMatch =
                masteryBenefit.description.match(/(\d+)% damage/);
            if (damageMultiplierMatch) {
                const multiplier = parseInt(damageMultiplierMatch[1], 10) / 100;
                attackPower *= multiplier;
                messages.push(
                    `\`➰\` Mastery effect activated! Your ${weaponType} deals ${(
                        multiplier * 100
                    ).toFixed(0)}% damage.`,
                );
            }
        }

        if (equippedWeaponName.includes("Wolf's Gravestone")) {
            const hpThreshold = Math.floor(monster.currentHp / 1000);
            if (hpThreshold > 0) {
                const damageMultiplier = 1 + 0.5 * hpThreshold;
                attackPower *= damageMultiplier;
                messages.push(
                    `\`🐺\` Wolf's Gravestone effect! You deal ${(
                        damageMultiplier * 100
                    ).toFixed(0)}% more damage based on the monster's HP.`,
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
            `\`⚡\` Fury effect activated! Your attack deals double damage this turn.`,
        );

        furyEffect.remainingUses -= 1;
        if (furyEffect.remainingUses <= 0) {
            stats.activeEffects = stats.activeEffects.filter(
                (effect) => effect !== furyEffect,
            );
        }
    }

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
    let attackMissed = false;
    let monsterDefended = false;
    let damageReduced = 0;

    if (has("Agent", monster) && !monsterState.vanishedUsed) {
        attackMissed = true;
        monsterState.vanishedUsed = true;
        messages.push(
            `\`👤\` The ${monster.name} has vanished, dodging your attack!`,
        );
    }

    const isLawachurlOrElectro = has(["Lawachurl", "Electro"], monster);
    const stunChance = Math.random() < 0.25;

    if (isLawachurlOrElectro && stunChance) {
        messages.push(
            `\`💫\` The ${monster.name} stunned you! You missed your attack.`,
        );
        attackMissed = true;
    }

    const isAnemo = has("Anemo", monster);
    const dodgeChance = Math.random() < 0.25;

    if (isAnemo && dodgeChance) {
        messages.push(
            `\`💨\` The ${monster.name} dodged your attack with its Anemo agility!`,
        );
        attackMissed = true;
    }

    const isBoss = has("Boss", monster, true);
    const bossDodgeChance = Math.random() < 0.2;

    if (isBoss && bossDodgeChance) {
        messages.push(
            `\`👑\` The ${monster.name} dodged your attack with its superior agility!`,
        );
        attackMissed = true;
    }

    const isFatui = has(["Fatui"], monster, true);
    const displacementChance = Math.random() < 0.25;
    if (isFatui && displacementChance) {
        monsterState.displaced = true;
        messages.push(
            `\`〽️\` The ${monster.name} displaced you! You will deal 80% less damage next turn.`,
        );
    }

    const monsterDefChance = monster.defChance || 0;
    const monsterDefValue = monster.defValue || 0;

    const monsterDefendedCheck = Math.random() * 100 < monsterDefChance;

    if (monsterDefendedCheck) {
        const initialAttackPower = attackPower;
        attackPower = (100 * attackPower) / (monsterDefValue + 100);
        damageReduced = initialAttackPower - attackPower;
        monsterDefended = true;
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
        message += " 💢 (Critical Hit!)";
    }
    if (monsterDefended && damageReduced > 0) {
        message += ` 🛡️ (Defended ${damageReduced.toFixed(2)})`;
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
