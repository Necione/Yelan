import { embedComment, get, noop } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type {
    ChatInputCommandInteraction,
    Message,
    PublicThreadChannel,
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
        const burnDamage = Math.ceil(stats.maxHP * 0.03);
        currentPlayerHp -= burnDamage;
        messages.push(
            `\`🔥\` The ${monster.name} inflicted Burn! You took \`${burnDamage}\` Burn damage.`,
        );
    }

    if (
        (monster.name.includes("Cryo") || monster.name.includes("Frost")) &&
        Math.random() < 0.5
    ) {
        const crippleDamage = Math.ceil(stats.maxHP * 0.05);
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
        let initialPlayerHp = currentPlayerHp;

        const hasVampirism =
            stats.skills.some((skill) => skill.name === "Vampirism") &&
            stats.activeSkills.includes("Vampirism");

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

        let isPlayerTurn = !isMonsterFirst;

        let monsterState = {
            displaced: false,
            vanishedUsed: false,
        };

        let isFirstTurn = true;

        const hasCrystallize =
            stats.skills.some((skill) => skill.name === "Crystallize") &&
            stats.activeSkills.includes("Crystallize");

        let turnNumber = 1;

        const hasSloth =
            stats.skills.some((skill) => skill.name === "Sloth") &&
            stats.activeSkills.includes("Sloth");

        const hasWrath =
            stats.skills.some((skill) => skill.name === "Wrath") &&
            stats.activeSkills.includes("Wrath");

        if (hasSloth) {
            currentPlayerHp = Math.floor(stats.hp * 1.25);
        } else {
            currentPlayerHp = stats.hp;
        }

        if (hasWrath) {
            currentPlayerHp = Math.floor(currentPlayerHp * 0.75);
        }

        currentPlayerHp = Math.min(currentPlayerHp, stats.maxHP * 1.5);

        initialPlayerHp = currentPlayerHp;

        const startingMessages: string[] = [];
        if (hasSloth) {
            startingMessages.push(
                `\`💤\` **SIN OF SLOTH** acivated. Your starting HP is increased by 25%.`,
            );
        }
        if (hasWrath) {
            startingMessages.push(
                `\`💢\` **SIN OF WRATH** activated. Your starting HP is reduced by 25%.`,
            );
        }

        if (startingMessages.length > 0) {
            await thread
                ?.send(">>> " + startingMessages.join("\n"))
                .catch(noop);
        }

        while (currentPlayerHp > 0 && currentMonsterHp > 0) {
            if (isPlayerTurn) {
                const playerMessages: string[] = [];

                const result = playerAttack(
                    stats,
                    monster,
                    currentPlayerHp,
                    currentMonsterHp,
                    hasVigilance,
                    vigilanceUsed,
                    monsterState,
                    isFirstTurn,
                    playerMessages,
                    hasWrath,
                );

                currentMonsterHp = result.currentMonsterHp;
                currentPlayerHp = result.currentPlayerHp;
                vigilanceUsed = result.vigilanceUsed;
                monsterState = result.monsterState;

                if (playerMessages.length > 0) {
                    await thread
                        .send(">>> " + playerMessages.join("\n"))
                        .catch(noop);
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

                if (currentMonsterHp <= 0) {
                    if (hasVampirism) {
                        const healAmount = stats.maxHP * 0.2;
                        currentPlayerHp = Math.min(
                            currentPlayerHp + healAmount,
                            stats.maxHP,
                        );
                        const vampirismMessage = `\`🦇\` Vampirism skill activated! You healed \`${healAmount.toFixed(
                            2,
                        )}\` HP.`;
                        await thread
                            ?.send(">>> " + vampirismMessage)
                            .catch(noop);
                    }
                    break;
                }

                isPlayerTurn = false;
            } else {
                const monsterMessages: string[] = [];

                currentPlayerHp = await monsterAttack(
                    stats,
                    monster,
                    currentPlayerHp,
                    monsterMessages,
                    turnNumber,
                    hasCrystallize,
                );

                if (monsterMessages.length > 0) {
                    await thread
                        .send(">>> " + monsterMessages.join("\n"))
                        .catch(noop);
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

                if (currentPlayerHp <= 0) {
                    break;
                }

                isPlayerTurn = true;
            }

            await new Promise((resolve) => setTimeout(resolve, get.secs(2)));

            stats.hp = Math.min(currentPlayerHp, stats.maxHP);
            await updateUserStats(stats.userId, { hp: stats.hp });

            if (isFirstTurn) {
                isFirstTurn = false;
            }

            turnNumber++;
        }

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
    };

    await handleMonsterBattle();
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
