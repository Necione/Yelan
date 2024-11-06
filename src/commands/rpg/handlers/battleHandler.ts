import type { UserStats } from "@prisma/client";
import { skills } from "../../../plugins/other/utils";
import { updateUserStats } from "../../../services";
import { getRandomValue, type Monster } from "../../../utils/hunt";

export async function playerAttack(
    stats: UserStats,
    monster: Monster,
    currentPlayerHp: number,
    currentMonsterHp: number,
    hasVigilance: boolean,
    vigilanceUsed: boolean,
    monsterState: { displaced: boolean; vanishedUsed: boolean },
    isFirstTurn: boolean,
    messages: string[],
    hasWrath: boolean,
): Promise<{
    currentMonsterHp: number;
    currentPlayerHp: number;
    vigilanceUsed: boolean;
    monsterState: { displaced: boolean; vanishedUsed: boolean };
}> {
    let attackPower = stats.attackPower;
    let defValue = stats.defValue;

    if (hasWrath) {
        attackPower *= 1.5;
        messages.push(
            `\`💢\` Wrath skill activated! You deal 150% more damage.`,
        );
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

    const hasPaladin = skills.has(stats, "Paladin");
    if (hasPaladin) {
        const temp = attackPower;
        attackPower = defValue;
        defValue = temp;
        messages.push(
            `\`🛡️\` Paladin skill activated! Your Attack Power and Defense VALUE have been swapped.`,
        );
    }

    const hasHeartbroken = skills.has(stats, "Heartbroken");

    let bonusDamage = 0;
    if (hasHeartbroken && isFirstTurn) {
        bonusDamage = currentPlayerHp / 4;
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

    const isNobushi = ["Nobushi"].includes(monster.group);

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

    if (stats.activeEffects && stats.activeEffects.length > 0) {
        const weaknessEffect = stats.activeEffects.find(
            (effect) => effect.name === "Weakness" && effect.remainingUses > 0,
        );
        if (weaknessEffect) {
            attackPower *= 0.75;
            messages.push(
                `\`🥀\` Weakness effect reduces your attack power by 25%. (${
                    weaknessEffect.remainingUses - 1
                } uses left)`,
            );

            weaknessEffect.remainingUses -= 1;
            if (weaknessEffect.remainingUses <= 0) {
                stats.activeEffects = stats.activeEffects.filter(
                    (effect) => effect !== weaknessEffect,
                );
            }

            await updateUserStats(stats.userId, {
                activeEffects: stats.activeEffects,
            });
        }
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

    if (hasVigilance && !vigilanceUsed) {
        const vigilanceAttackPower = attackPower / 2;
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

    if (bonusDamage > 0) {
        currentMonsterHp -= bonusDamage;
        messages.push(
            `\`💔\` You dealt an additional \`${bonusDamage.toFixed(
                2,
            )}\` bonus damage (Heartbroken).`,
        );
    }

    const hasKindle = skills.has(stats, "Kindle");

    if (hasKindle) {
        const kindleBonusDamage = stats.maxHP * 0.1;
        currentMonsterHp -= kindleBonusDamage;

        messages.push(
            `\`🔥\` You dealt an additional \`${kindleBonusDamage.toFixed(
                2,
            )}\` bonus damage with the Kindle skill!`,
        );
    }

    return { currentMonsterHp, currentPlayerHp, vigilanceUsed, monsterState };
}

export async function monsterAttack(
    stats: UserStats,
    monster: Monster,
    currentPlayerHp: number,
    messages: string[],
    turnNumber: number,
    hasCrystallize: boolean,
): Promise<number> {
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

    const { isCrit, multiplier } = calculateCriticalHit(
        monster.critChance || 0,
        monster.critValue || 1,
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

    const defChance = stats.defChance || 0;
    const defValue = stats.defValue || 0;
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

    if (monster.name.includes("Pyro") || monster.name.includes("Flames")) {
        const burnDamage = Math.ceil(
            stats.maxHP * (0.03 + 0.01 * Math.floor(stats.worldLevel / 2)),
        );
        currentPlayerHp -= burnDamage;
        messages.push(
            `\`🔥\` The ${monster.name} inflicted Burn! You took \`${burnDamage}\` Burn damage.`,
        );
    }

    if (
        (monster.name.includes("Cryo") || monster.name.includes("Frost")) &&
        Math.random() < 0.5
    ) {
        const crippleDamage = Math.ceil(
            stats.maxHP * (0.05 + 0.01 * Math.floor(stats.worldLevel / 2)),
        );
        currentPlayerHp -= crippleDamage;
        messages.push(
            `\`❄️\` The ${monster.name} inflicted Cripple! You took \`${crippleDamage}\` Cripple damage.`,
        );
    }

    currentPlayerHp -= monsterDamage;
    if (currentPlayerHp < 0) {
        currentPlayerHp = 0;
    }

    const hasLeechSkill = skills.has(stats, "Leech");

    const leechTriggered = Math.random() < 0.5;
    if (hasLeechSkill && leechTriggered) {
        const healAmount = Math.ceil(monsterStats.maxHp * 0.1);
        currentPlayerHp = Math.min(currentPlayerHp + healAmount, stats.maxHP);
        messages.push(
            `\`💖\` Leech skill activated! You healed \`${healAmount}\` HP from the ${monster.name}.`,
        );
    }

    await updateUserStats(stats.userId, { hp: currentPlayerHp });

    messages.push(
        `\`⚔️\` The ${monster.name} dealt \`${monsterDamage.toFixed(
            2,
        )}\` damage to you${
            defended ? ` 🛡️ (Reduced DMG by ${damageReduced.toFixed(2)})` : ""
        }${isCrit ? " 💢 (Critical Hit!)" : ""}.`,
    );

    return currentPlayerHp;
}

export function applyAttackModifiers(
    attackPower: number,
    stats: UserStats,
    monster: Monster,
    monsterState: { displaced: boolean; vanishedUsed: boolean },
    messages: string[],
): {
    attackPower: number;
    monsterState: { displaced: boolean; vanishedUsed: boolean };
} {
    const hasBackstab = skills.has(stats, "Backstab");

    const isHumanOrFatui = ["Human", "Fatui", "Nobushi"].includes(
        monster.group,
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

    return { attackPower, monsterState };
}

export function checkMonsterDefenses(
    attackPower: number,
    stats: UserStats,
    monster: Monster,
    monsterState: { displaced: boolean; vanishedUsed: boolean },
    messages: string[],
): {
    attackPower: number;
    attackMissed: boolean;
    monsterDefended: boolean;
    damageReduced: number;
    monsterState: { displaced: boolean; vanishedUsed: boolean };
} {
    let attackMissed = false;
    let monsterDefended = false;
    let damageReduced = 0;

    if (monster.name.includes("Agent") && !monsterState.vanishedUsed) {
        attackMissed = true;
        monsterState.vanishedUsed = true;
        messages.push(
            `\`👤\` The ${monster.name} has vanished, dodging your attack!`,
        );
    }

    const isLawachurlOrElectro =
        monster.name.includes("Lawachurl") || monster.name.includes("Electro");
    const stunChance = Math.random() < 0.25;

    if (isLawachurlOrElectro && stunChance) {
        messages.push(
            `\`💫\` The ${monster.name} stunned you! You missed your attack.`,
        );
        attackMissed = true;
    }

    const isAnemo = monster.name.includes("Anemo");
    const dodgeChance = Math.random() < 0.25;

    if (isAnemo && dodgeChance) {
        messages.push(
            `\`💨\` The ${monster.name} dodged your attack with its Anemo agility!`,
        );
        attackMissed = true;
    }

    const isBoss = ["Boss"].includes(monster.group);
    const bossDodgeChance = Math.random() < 0.2;

    if (isBoss && bossDodgeChance) {
        messages.push(
            `\`👑\` The ${monster.name} dodged your attack with its superior agility!`,
        );
        attackMissed = true;
    }

    const isFatui = ["Fatui"].includes(monster.group);
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
        message += ` 🛡️ (Reduced DMG by ${damageReduced.toFixed(2)})`;
    }
    messages.push(message);
}
