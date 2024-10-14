import type { UserStats } from "@prisma/client";
import { updateUserStats } from "../../../services";
import { getRandomValue, type Monster } from "../../../utils/hunt";

export function playerAttack(
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
): {
    currentMonsterHp: number;
    currentPlayerHp: number;
    vigilanceUsed: boolean;
    monsterState: { displaced: boolean; vanishedUsed: boolean };
} {
    let attackPower = stats.attackPower;

    if (hasWrath) {
        attackPower *= 1.5;
        messages.push(
            `\`💢\` Wrath skill activated! You deal 150% more damage.`,
        );
    }

    const hasHeartbroken =
        stats.skills.some((skill) => skill.name === "Heartbroken") &&
        stats.activeSkills.includes("Heartbroken");

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

    const { isCrit, multiplier } = calculateCriticalHit(
        stats.critChance || 0,
        stats.critValue || 1,
    );
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
        monster.defValue,
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

    const hasKindle =
        stats.skills.some((skill) => skill.name === "Kindle") &&
        stats.activeSkills.includes("Kindle");

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
        monsterDamage *= 1.5;
    }

    const { isCrit, multiplier } = calculateCriticalHit(
        monster.critChance || 0,
        monster.critValue || 1,
    );
    monsterDamage *= multiplier;

    if (hasCrystallize) {
        const segment = Math.ceil(turnNumber / 2);
        let damageMultiplier: number;

        if (segment <= 6) {
            damageMultiplier = 0.4 + segment * 0.1;
        } else {
            damageMultiplier = 1.0 + (segment - 6) * 0.1;
            damageMultiplier = Math.min(damageMultiplier, 2.0);
        }

        monsterDamage *= damageMultiplier;

        let effectDescription = "";
        if (segment <= 6) {
            const reductionPercent = (1 - damageMultiplier) * 100;
            effectDescription = `\`🧊\` Crystallize reduces the ${
                monster.name
            }'s damage by ${reductionPercent.toFixed(0)}%.`;
        } else {
            const increasePercent = (damageMultiplier - 1) * 100;
            effectDescription = `\`🧊\` Crystallize increases the ${
                monster.name
            }'s damage by ${increasePercent.toFixed(0)}%.`;
        }
        messages.push(effectDescription);
    }

    const defChance = stats.defChance || 0;
    const defValue = stats.defValue || 0;
    let defended = false;

    if (monster.group !== "Machine") {
        defended = Math.random() * 100 < defChance;

        if (defended) {
            monsterDamage = Math.max(monsterDamage * (1 - defValue), 0);
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

    const hasLeechSkill =
        stats.skills.some((skill) => skill.name === "Leech") &&
        stats.activeSkills.includes("Leech");

    const leechTriggered = Math.random() < 0.5;
    if (hasLeechSkill && leechTriggered) {
        const healAmount = Math.ceil(monsterStats.maxHp * 0.05);
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
            defended ? ` 🛡️ (Defended: -${(defValue * 100).toFixed(2)}%)` : ""
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
    const hasBackstab =
        stats.skills.some((skill) => skill.name === "Backstab") &&
        stats.activeSkills.includes("Backstab");

    const isHumanOrFatui = ["Human", "Fatui"].includes(monster.group);

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
    monsterState: { displaced: boolean; vanishedUsed: boolean };
} {
    let attackMissed = false;
    let monsterDefended = false;

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

    const monsterDefChance = (monster.defChance || 0) * 100;
    const monsterDefValue = monster.defValue || 0;

    const monsterDefendedCheck = Math.random() * 100 < monsterDefChance;

    if (monsterDefendedCheck) {
        attackPower = Math.max(attackPower * (1 - monsterDefValue), 0);
        monsterDefended = true;
    }

    return { attackPower, attackMissed, monsterDefended, monsterState };
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
    defValue: number | undefined,
    messages: string[],
) {
    let message = `\`⚔️\` You dealt \`${damage.toFixed(
        2,
    )}\` damage to the ${monsterName}`;
    if (isCrit) {
        message += " 💢 (Critical Hit!)";
    }
    if (monsterDefended && defValue !== undefined) {
        message += ` 🛡️ (Defended: -${(defValue * 100).toFixed(2)}%)`;
    }
    messages.push(message);
}
