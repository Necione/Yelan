import { noop } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import type { ThreadChannel } from "discord.js";
import { updateUserStats } from "../../../services";
import type { Monster } from "../../../utils/hunt";
import { applyAttackModifiers, checkMonsterDefenses } from "./huntHandler";

export async function handleAquaSimulacraAttack(
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentMonsterHp: number,
    vigilanceUsed: boolean,
    monsterState: { displaced: boolean; vanishedUsed: boolean },
    isFirstTurn: boolean,
): Promise<{
    currentMonsterHp: number;
    vigilanceUsed: boolean;
    monsterState: { displaced: boolean; vanishedUsed: boolean };
}> {
    const emojis = ["💎", "🍒", "🪙", "🍀", "🍉"];

    const roll = [
        emojis[Math.floor(Math.random() * emojis.length)],
        emojis[Math.floor(Math.random() * emojis.length)],
        emojis[Math.floor(Math.random() * emojis.length)],
    ];

    await thread.send(`>>> \`🎰\` You rolled: ${roll.join(" ")}`).catch(noop);

    const emojiCount = roll.reduce(
        (acc, emoji) => {
            acc[emoji] = (acc[emoji] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>,
    );

    let attackPower = stats.attackPower;

    const hasHeartbroken =
        stats.skills.some((skill) => skill.name === "Heartbroken") &&
        stats.activeSkills.includes("Heartbroken");

    if (hasHeartbroken && isFirstTurn) {
        const bonusDamage = stats.hp;
        attackPower += bonusDamage;
        await thread
            .send(
                `>>> \`💔\` You will deal an additional \`${bonusDamage.toFixed(
                    2,
                )}\` bonus DMG (Heartbroken).`,
            )
            .catch(noop);
    }

    let bonusDamage = 0;

    if (emojiCount["💎"]) {
        bonusDamage += attackPower * 0.5 * emojiCount["💎"];
    }

    if (emojiCount["🍀"]) {
        attackPower *= 2 ** emojiCount["🍀"];
    }

    const modifiersResult = await applyAttackModifiers(
        attackPower,
        stats,
        monster,
        thread,
        monsterState,
    );
    attackPower = modifiersResult.attackPower;
    monsterState = modifiersResult.monsterState;

    const critChance = stats.critChance || 0;
    const critValue = stats.critValue || 1;
    const isCrit = Math.random() * 100 < critChance;
    if (isCrit) {
        attackPower *= critValue;
    }

    const defenseResult = await checkMonsterDefenses(
        attackPower,
        stats,
        monster,
        thread,
        monsterState,
    );
    attackPower = defenseResult.attackPower;
    const attackMissed = defenseResult.attackMissed;
    monsterState = defenseResult.monsterState;

    if (attackMissed) {
        return { currentMonsterHp, vigilanceUsed, monsterState };
    }

    const monsterDefended = attackPower < stats.attackPower;
    const monsterDefValue = monster.defValue || 0;

    if (Object.values(emojiCount).includes(3)) {
        attackPower *= 100;
        await thread
            .send(
                `>>> \`⚔️\` You dealt \`${attackPower.toFixed(
                    2,
                )}\` damage to the ${monster.name} 💯 (Jackpot!)${
                    isCrit ? " 💢 (Critical Hit!)" : ""
                }${
                    monsterDefended ? ` 🛡️ (Defended: -${monsterDefValue})` : ""
                }.`,
            )
            .catch(noop);
    } else if (Object.values(emojiCount).includes(2)) {
        attackPower *= stats.critValue || 1;
        await thread
            .send(
                `>>> \`⚔️\` You dealt \`${attackPower.toFixed(
                    2,
                )}\` damage to the ${monster.name} 💢 (Lucky Hit!)${
                    isCrit ? " 💢 (Critical Hit!)" : ""
                }${
                    monsterDefended ? ` 🛡️ (Defended: -${monsterDefValue})` : ""
                }.`,
            )
            .catch(noop);
    } else {
        await thread
            .send(
                `>>> \`⚔️\` You dealt \`${attackPower.toFixed(
                    2,
                )}\` damage to the ${monster.name}${
                    isCrit ? " 💢 (Critical Hit!)" : ""
                }${
                    monsterDefended ? ` 🛡️ (Defended: -${monsterDefValue})` : ""
                }.`,
            )
            .catch(noop);
    }

    currentMonsterHp -= attackPower + bonusDamage;

    if (bonusDamage > 0) {
        await thread
            .send(
                `>>> \`💎\` You dealt an additional \`${bonusDamage.toFixed(
                    2,
                )}\` bonus damage from diamonds!`,
            )
            .catch(noop);
    }

    const hasVigilance =
        stats.skills.some((skill) => skill.name === "Vigilance") &&
        stats.activeSkills.includes("Vigilance");

    if (hasVigilance && !vigilanceUsed) {
        const vigilanceAttackPower = attackPower / 2;
        currentMonsterHp -= vigilanceAttackPower;
        vigilanceUsed = true;

        await thread
            .send(
                `>>> \`⚔️\` You dealt \`${vigilanceAttackPower.toFixed(
                    2,
                )}\` damage to the ${monster.name} ✨ (Vigilance).`,
            )
            .catch(noop);
    }

    const hasKindle =
        stats.skills.some((skill) => skill.name === "Kindle") &&
        stats.activeSkills.includes("Kindle");

    if (hasKindle) {
        const kindleBonusDamage = stats.maxHP * 0.1;
        currentMonsterHp -= kindleBonusDamage;

        await thread
            .send(
                `>>> \`🔥\` You dealt an additional \`${kindleBonusDamage.toFixed(
                    2,
                )}\` bonus damage with the Kindle skill!`,
            )
            .catch(noop);
    }

    return { currentMonsterHp, vigilanceUsed, monsterState };
}

export async function handleStaffOfHomaAttack(
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentMonsterHp: number,
    vigilanceUsed: boolean,
    monsterState: { displaced: boolean; vanishedUsed: boolean },
    isFirstTurn: boolean,
): Promise<{
    currentMonsterHp: number;
    vigilanceUsed: boolean;
    monsterState: { displaced: boolean; vanishedUsed: boolean };
}> {
    const getHeartIcon = (currentHp: number, maxHp: number): string => {
        const currentHpPercentage = currentHp / maxHp;
        if (currentHpPercentage > 1) {
            return "💜";
        } else if (currentHpPercentage > 0.75) {
            return "💚";
        } else if (currentHpPercentage > 0.5) {
            return "💛";
        } else if (currentHpPercentage > 0.25) {
            return "🧡";
        } else if (currentHpPercentage > 0.05) {
            return "💗";
        } else {
            return "☠️";
        }
    };

    stats.hp -= 5;
    if (stats.hp < 0) {
        stats.hp = 0;
    }

    await updateUserStats(stats.userId, { hp: stats.hp });

    await thread
        .send(`>>> \`💔\` You sacrificed \`5 HP\` to use the Staff of Homa.`)
        .catch(noop);

    let currentHpPercentage = stats.hp / stats.maxHP;
    if (currentHpPercentage <= 0) {
        currentHpPercentage = 0.05;
    }

    const heartIcon = getHeartIcon(stats.hp, stats.maxHP);

    let damageMultiplier = Math.pow(1 / currentHpPercentage, 1.661);

    if (damageMultiplier > 10) {
        damageMultiplier = 10;
    }

    if (currentHpPercentage > 1) {
        damageMultiplier = 0.5;
    }

    let attackPower = stats.attackPower * damageMultiplier;

    const hasHeartbroken =
        stats.skills.some((skill) => skill.name === "Heartbroken") &&
        stats.activeSkills.includes("Heartbroken");

    if (hasHeartbroken && isFirstTurn) {
        const bonusDamage = stats.hp;
        attackPower += bonusDamage;
        await thread
            .send(
                `>>> \`💔\` You will deal an additional \`${bonusDamage.toFixed(
                    2,
                )}\` bonus DMG (Heartbroken).`,
            )
            .catch(noop);
    }

    const modifiersResult = await applyAttackModifiers(
        attackPower,
        stats,
        monster,
        thread,
        monsterState,
    );
    attackPower = modifiersResult.attackPower;
    monsterState = modifiersResult.monsterState;

    const critChance = stats.critChance || 0;
    const critValue = stats.critValue || 1;
    const isCrit = Math.random() * 100 < critChance;
    if (isCrit) {
        attackPower *= critValue;
    }

    const defenseResult = await checkMonsterDefenses(
        attackPower,
        stats,
        monster,
        thread,
        monsterState,
    );
    attackPower = defenseResult.attackPower;
    const attackMissed = defenseResult.attackMissed;
    monsterState = defenseResult.monsterState;

    if (attackMissed) {
        return { currentMonsterHp, vigilanceUsed, monsterState };
    }

    const monsterDefended = attackPower < stats.attackPower * damageMultiplier;
    const monsterDefValue = monster.defValue || 0;

    const hasVigilance =
        stats.skills.some((skill) => skill.name === "Vigilance") &&
        stats.activeSkills.includes("Vigilance");

    if (hasVigilance && !vigilanceUsed) {
        const vigilanceAttackPower = attackPower / 2;
        currentMonsterHp -= vigilanceAttackPower;
        vigilanceUsed = true;

        await thread
            .send(
                `>>> \`⚔️\` You dealt \`${vigilanceAttackPower.toFixed(
                    2,
                )}\` damage to the ${monster.name} ✨ (Vigilance).`,
            )
            .catch(noop);
    }

    currentMonsterHp -= attackPower;

    await thread
        .send(
            `>>> \`${heartIcon}\` You dealt \`${attackPower.toFixed(
                2,
            )}\` damage to the ${monster.name}${
                isCrit ? " 💢 (Critical Hit!)" : ""
            }${monsterDefended ? ` 🛡️ (Defended: -${monsterDefValue})` : ""}.`,
        )
        .catch(noop);

    const hasKindle =
        stats.skills.some((skill) => skill.name === "Kindle") &&
        stats.activeSkills.includes("Kindle");

    if (hasKindle) {
        const kindleBonusDamage = stats.maxHP * 0.1;
        currentMonsterHp -= kindleBonusDamage;

        await thread
            .send(
                `>>> \`🔥\` You dealt an additional \`${kindleBonusDamage.toFixed(
                    2,
                )}\` bonus damage with the Kindle skill!`,
            )
            .catch(noop);
    }

    return { currentMonsterHp, vigilanceUsed, monsterState };
}
