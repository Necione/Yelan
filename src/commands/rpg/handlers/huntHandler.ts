import { embedComment, get, noop } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type {
    ChatInputCommandInteraction,
    Message,
    PublicThreadChannel,
    ThreadChannel,
} from "discord.js";
import { EmbedBuilder } from "discord.js";
import { updateUserStats } from "../../../services";
import {
    getEncounterDescription,
    getRandomMonster,
    getRandomValue,
    initializeMonsters,
    type Monster,
} from "../../../utils/hunt";
import { handleDefeat, handleVictory } from "./conditions";

export async function playerAttack(
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentMonsterHp: number,
    hasVigilance: boolean,
    vigilanceUsed: boolean,
    monsterState: { displaced: boolean; vanishedUsed: boolean },
    isFirstTurn: boolean,
): Promise<{
    currentMonsterHp: number;
    vigilanceUsed: boolean;
    monsterState: { displaced: boolean; vanishedUsed: boolean };
}> {
    {
        let attackPower = stats.attackPower;

        const hasHeartbroken =
            stats.skills.some((skill) => skill.name === "Heartbroken") &&
            stats.activeSkills.includes("Heartbroken");

        let bonusDamage = 0;
        if (hasHeartbroken && isFirstTurn) {
            bonusDamage = stats.hp / 4;
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

        const { isCrit, multiplier } = calculateCriticalHit(
            stats.critChance || 0,
            stats.critValue || 1,
        );
        attackPower *= multiplier;

        const defenseResult = await checkMonsterDefenses(
            attackPower,
            stats,
            monster,
            thread,
            monsterState,
        );
        attackPower = defenseResult.attackPower;
        const attackMissed = defenseResult.attackMissed;
        const monsterDefended = defenseResult.monsterDefended;
        monsterState = defenseResult.monsterState;

        if (attackMissed) {
            return { currentMonsterHp, vigilanceUsed, monsterState };
        }

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

        await sendDamageMessage(
            thread,
            attackPower,
            monster.name,
            isCrit,
            monsterDefended,
            monster.defValue,
        );

        if (bonusDamage > 0) {
            currentMonsterHp -= bonusDamage;
            await thread
                .send(
                    `>>> \`💔\` You dealt an additional \`${bonusDamage.toFixed(
                        2,
                    )}\` bonus damage (Heartbroken).`,
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
}

export async function monsterAttack(
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentPlayerHp: number,
): Promise<number> {
    const monsterStats = monster.getStatsForWorldLevel(stats.worldLevel);
    if (!monsterStats) {
        throw new Error(`Stats not found for monster: ${monster.name}`);
    }

    let monsterDamage = getRandomValue(
        monsterStats.minDamage,
        monsterStats.maxDamage,
    );

    const { isCrit, multiplier } = calculateCriticalHit(
        monster.critChance || 0,
        monster.critValue || 1,
    );
    monsterDamage *= multiplier;

    const defChance = stats.defChance || 0;
    const defValue = stats.defValue || 0;
    const defended = Math.random() * 100 < defChance;

    if (defended) {
        monsterDamage = Math.max(monsterDamage * (1 - defValue), 0);
    }

    if (monster.name.includes("Pyro")) {
        const burnDamage = Math.ceil(stats.maxHP * 0.03);
        currentPlayerHp -= burnDamage;
        await thread
            .send(
                `>>> \`🔥\` The ${monster.name} inflicted Burn! You took \`${burnDamage}\` Burn damage.`,
            )
            .catch(noop);
    }

    if (monster.name.includes("Cryo") && Math.random() < 0.5) {
        const crippleDamage = Math.ceil(stats.maxHP * 0.05);
        currentPlayerHp -= crippleDamage;
        await thread
            .send(
                `>>> \`❄️\` The ${monster.name} inflicted Cripple! You took \`${crippleDamage}\` Cripple damage.`,
            )
            .catch(noop);
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
        const healAmount = Math.ceil(monsterStats.maxHp * 0.1);
        currentPlayerHp = Math.min(currentPlayerHp + healAmount, stats.maxHP);
        await thread
            .send(
                `>>> \`💖\` Leech skill activated! You healed \`${healAmount}\` HP from the ${monster.name}.`,
            )
            .catch(noop);
    }

    await updateUserStats(stats.userId, { hp: currentPlayerHp });

    await thread
        .send(
            `>>> \`⚔️\` The ${monster.name} dealt \`${monsterDamage.toFixed(
                2,
            )}\` damage to you${
                defended
                    ? ` 🛡️ (Defended: -${(defValue * 100).toFixed(2)}%)`
                    : ""
            }${isCrit ? " 💢 (Critical Hit!)" : ""}.`,
        )
        .catch(noop);

    return currentPlayerHp;
}

export async function handleHunt(
    i: ChatInputCommandInteraction,
    r: Message,
    stats: UserStats,
    userWallet: UserWallet,
) {
    await initializeMonsters();

    const numberOfMonsters =
        stats.worldLevel >= 10
            ? Math.floor(Math.random() * 2) + 2
            : stats.worldLevel >= 5
              ? Math.floor(Math.random() * 2) + 1
              : 1;

    const monstersEncountered: Monster[] = [];
    let currentPlayerHp = stats.hp;

    for (let encounter = 0; encounter < numberOfMonsters; encounter++) {
        const monster = await getRandomMonster(
            stats.worldLevel,
            stats.location,
            {
                currentHp: stats.hp,
                attackPower: stats.attackPower,
                critChance: stats.critChance,
                critValue: stats.critValue,
                defChance: stats.defChance,
                defValue: stats.defValue,
                maxHp: stats.maxHP,
            },
        );

        if (!monster) {
            await i
                .editReply(
                    embedComment(
                        `This area (${stats.location}) has no monsters to encounter.\nTry to </travel:1281778318160691301> to another location!`,
                    ),
                )
                .catch(noop);

            await updateUserStats(i.user.id, {
                isHunting: false,
            });

            return;
        }

        monstersEncountered.push(monster);
    }

    let currentMonsterIndex = 0;

    const handleMonsterBattle = async (thread?: PublicThreadChannel<false>) => {
        const monster = monstersEncountered[currentMonsterIndex];
        const selectedDescription = getEncounterDescription(
            monster.name,
            stats.location,
        );
        const monsterStats = monster.getStatsForWorldLevel(stats.worldLevel);
        if (!monsterStats) {
            throw new Error(`Stats not found for monster: ${monster.name}`);
        }
        let currentMonsterHp = Math.floor(
            getRandomValue(monsterStats.minHp, monsterStats.maxHp),
        );

        const initialMonsterHp = currentMonsterHp;
        const initialPlayerHp = currentPlayerHp;

        const createHealthBar = (
            current: number,
            max: number,
            length: number = 20,
        ): string => {
            current = Math.max(0, Math.min(current, max));
            const filledLength = Math.round((current / max) * length);
            const emptyLength = Math.max(length - filledLength, 0);

            const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);
            return `\`${bar}\` ${current.toFixed(2)}/${max.toFixed(2)} HP`;
        };

        const embedColor = monster.group === "Chasm" ? "Orange" : "Aqua";

        const battleEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`You encountered a ${monster.name}!`)
            .setDescription(selectedDescription)
            .setThumbnail(monster.image)
            .addFields(
                {
                    name: "Your HP",
                    value: createHealthBar(currentPlayerHp, initialPlayerHp),
                    inline: true,
                },
                {
                    name: "Monster HP",
                    value: createHealthBar(currentMonsterHp, initialMonsterHp),
                    inline: true,
                },
            );

        await i
            .editReply({
                embeds: [battleEmbed],
            })
            .catch(noop);

        if (!thread) {
            thread =
                (await r
                    .startThread({
                        name: `Battle with ${monster.name}`,
                        autoArchiveDuration: 60,
                    })
                    .catch(noop)) || undefined;

            if (!thread) {
                await i
                    .editReply(embedComment(`Unable to create the thread.`))
                    .catch(noop);
                return;
            }
        } else {
            await thread
                .send(
                    `Another monster has appeared! You are now facing ${monster.name}.`,
                )
                .catch(noop);
        }

        const hasVigilance =
            stats.skills.some((skill) => skill.name === "Vigilance") &&
            stats.activeSkills.includes("Vigilance");

        const hasDistraction =
            stats.skills.some((skill) => skill.name === "Distraction") &&
            stats.activeSkills.includes("Distraction");

        let vigilanceUsed = false;

        let isMonsterFirst: boolean;
        if (hasDistraction) {
            isMonsterFirst = Math.random() >= 0.75;
        } else {
            isMonsterFirst = Math.random() < 0.5;
        }

        let monsterState = {
            displaced: false,
            vanishedUsed: false,
        };

        let isFirstTurn = true;

        const battleInterval = setInterval(async () => {
            if (currentPlayerHp <= 0 || currentMonsterHp <= 0) {
                clearInterval(battleInterval);

                if (currentPlayerHp > 0) {
                    if (currentMonsterIndex < monstersEncountered.length - 1) {
                        currentMonsterIndex++;
                        await handleMonsterBattle(thread);
                    } else {
                        if (thread) {
                            await handleVictory(
                                i,
                                thread,
                                stats,
                                monstersEncountered,
                                currentPlayerHp,
                                userWallet,
                            );
                        }
                    }
                } else {
                    if (thread) {
                        await handleDefeat(
                            i,
                            thread,
                            stats,
                            monstersEncountered[currentMonsterIndex],
                            currentPlayerHp,
                            userWallet,
                        );
                    }
                }

                return;
            }

            if (isMonsterFirst && currentMonsterHp > 0) {
                currentPlayerHp = await monsterAttack(
                    thread!,
                    stats,
                    monster,
                    currentPlayerHp,
                );

                stats.hp = currentPlayerHp;

                isMonsterFirst = false;
            } else {
                const result = await playerAttack(
                    thread!,
                    stats,
                    monster,
                    currentMonsterHp,
                    hasVigilance,
                    vigilanceUsed,
                    monsterState,
                    isFirstTurn,
                );

                currentMonsterHp = result.currentMonsterHp;
                vigilanceUsed = result.vigilanceUsed;
                monsterState = result.monsterState;

                if (currentMonsterHp > 0) {
                    currentPlayerHp = await monsterAttack(
                        thread!,
                        stats,
                        monster,
                        currentPlayerHp,
                    );
                }

                stats.hp = currentPlayerHp;

                if (isFirstTurn) {
                    isFirstTurn = false;
                }
            }

            const playerHpBar = createHealthBar(
                currentPlayerHp,
                initialPlayerHp,
            );
            const monsterHpBar = createHealthBar(
                currentMonsterHp,
                initialMonsterHp,
            );

            battleEmbed.setFields([
                {
                    name: "Your HP",
                    value: playerHpBar,
                    inline: true,
                },
                {
                    name: "Monster HP",
                    value: monsterHpBar,
                    inline: true,
                },
            ]);

            await i.editReply({ embeds: [battleEmbed] }).catch(noop);
        }, get.secs(4));
    };

    await handleMonsterBattle();
}

export async function applyAttackModifiers(
    attackPower: number,
    stats: UserStats,
    monster: Monster,
    thread: ThreadChannel,
    monsterState: { displaced: boolean; vanishedUsed: boolean },
): Promise<{
    attackPower: number;
    monsterState: { displaced: boolean; vanishedUsed: boolean };
}> {
    const hasBackstab =
        stats.skills.some((skill) => skill.name === "Backstab") &&
        stats.activeSkills.includes("Backstab");

    const isHumanOrFatui = ["Human", "Fatui"].includes(monster.group);

    if (hasBackstab && isHumanOrFatui) {
        attackPower *= 1.5;
        await thread
            .send(
                `>>> \`🗡️\` Backstab skill activated! You deal 150% more DMG!`,
            )
            .catch(noop);
    }

    if (monsterState.displaced) {
        attackPower *= 0.2;
        monsterState.displaced = false;
        await thread
            .send(
                `>>> \`〽️\` You are displaced! Your attack power is reduced by 80%.`,
            )
            .catch(noop);
    }

    return { attackPower, monsterState };
}

export async function checkMonsterDefenses(
    attackPower: number,
    stats: UserStats,
    monster: Monster,
    thread: ThreadChannel,
    monsterState: { displaced: boolean; vanishedUsed: boolean },
): Promise<{
    attackPower: number;
    attackMissed: boolean;
    monsterDefended: boolean;
    monsterState: { displaced: boolean; vanishedUsed: boolean };
}> {
    let attackMissed = false;
    let monsterDefended = false;

    if (monster.name.includes("Agent") && !monsterState.vanishedUsed) {
        attackMissed = true;
        monsterState.vanishedUsed = true;
        await thread
            .send(
                `>>> \`👤\` The ${monster.name} has vanished, dodging your attack!`,
            )
            .catch(noop);
    }

    const isLawachurlOrElectro =
        monster.name.includes("Lawachurl") || monster.name.includes("Electro");
    const stunChance = Math.random() < 0.25;

    if (isLawachurlOrElectro && stunChance) {
        await thread
            .send(
                `>>> \`💫\` The ${monster.name} stunned you! You missed your attack.`,
            )
            .catch(noop);
        attackMissed = true;
    }

    const isAnemo = monster.name.includes("Anemo");
    const dodgeChance = Math.random() < 0.25;

    if (isAnemo && dodgeChance) {
        await thread
            .send(
                `>>> \`💨\` The ${monster.name} dodged your attack with its Anemo agility!`,
            )
            .catch(noop);
        attackMissed = true;
    }

    const isFatui = ["Fatui"].includes(monster.group);
    const displacementChance = Math.random() < 0.25;
    if (isFatui && displacementChance) {
        monsterState.displaced = true;
        await thread
            .send(
                `>>> \`〽️\` The ${monster.name} displaced you! You will deal 80% less damage next turn.`,
            )
            .catch(noop);
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

async function sendDamageMessage(
    thread: ThreadChannel,
    damage: number,
    monsterName: string,
    isCrit: boolean,
    monsterDefended: boolean,
    defValue?: number,
) {
    let message = `>>> \`⚔️\` You dealt \`${damage.toFixed(
        2,
    )}\` damage to the ${monsterName}`;
    if (isCrit) {
        message += " 💢 (Critical Hit!)";
    }
    if (monsterDefended && defValue !== undefined) {
        message += ` 🛡️ (Defended: -${(defValue * 100).toFixed(2)}%)`;
    }
    await thread.send(message).catch(noop);
}
