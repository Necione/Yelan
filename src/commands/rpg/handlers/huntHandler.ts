import { embedComment, get, noop, sleep } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type {
    ChatInputCommandInteraction,
    Message,
    PublicThreadChannel,
    ThreadChannel,
} from "discord.js";
import { EmbedBuilder } from "discord.js";
import {
    addBalance,
    addItemToInventory,
    removeBalance,
    updateUserStats,
} from "../../../services";
import { cooldowns, texts } from "../../../utils";
import {
    calculateDrop,
    calculateExp,
    getEncounterDescription,
    getRandomMonster,
    getRandomValue,
    initializeMonsters,
    type Monster,
} from "../../../utils/hunt";
import {
    handleAquaSimulacraAttack,
    handleStaffOfHomaAttack,
} from "./specialHunt";

export async function handleVictory(
    i: ChatInputCommandInteraction,
    thread: ThreadChannel,
    stats: UserStats,
    monstersEncountered: Monster[],
    currentPlayerHp: number,
    userWallet: UserWallet,
) {
    const finalEmbed = new EmbedBuilder();
    let totalExpGained = 0;
    let dropsCollected: { item: string; amount: number }[] = [];

    let skillsActivated = "";

    for (const monster of monstersEncountered) {
        const expGained = calculateExp(monster.minExp, monster.maxExp);
        totalExpGained += expGained;

        const drops = calculateDrop(monster.drops);
        if (Array.isArray(drops)) {
            dropsCollected = dropsCollected.concat(drops);
            await addItemToInventory(i.user.id, drops);
        }
    }

    const numberOfMonsters = monstersEncountered.length;
    const xpReductionFactor = Math.max(0, 1 - (numberOfMonsters - 1) * 0.25);
    totalExpGained = Math.round(totalExpGained * xpReductionFactor);

    let newExp = stats.exp + totalExpGained;
    let expRequired = 20 * Math.pow(1.2, stats.worldLevel - 1);

    while (newExp >= expRequired) {
        newExp -= expRequired;
        stats.worldLevel += 1;
        expRequired = 20 * Math.pow(1.2, stats.worldLevel - 1);
    }

    await updateUserStats(i.user.id, {
        exp: newExp,
        worldLevel: stats.worldLevel,
    });

    const monstersFought = monstersEncountered
        .map((monster) => monster.name)
        .join(", ");

    finalEmbed
        .setColor("Green")
        .setTitle(`Victory in ${stats.location}!`)
        .setDescription(
            `You defeated the following monsters:\n\`${monstersFought}\`!\n-# \`⭐\` \`+${totalExpGained} EXP\` (\`🌍\` WL${stats.worldLevel})`,
        )
        .setThumbnail(
            monstersEncountered[monstersEncountered.length - 1].image,
        );

    const hasTotemSkill =
        stats.skills.some((skill) => skill.name === "Totem") &&
        stats.activeSkills.includes("Totem");

    if (hasTotemSkill) {
        const healAmount = Math.ceil(stats.maxHP * 0.05);
        currentPlayerHp = Math.min(currentPlayerHp + healAmount, stats.maxHP);

        skillsActivated += `\`💖\` Healed \`${healAmount}\` HP due to the Totem skill.\n`;

        await updateUserStats(i.user.id, {
            hp: currentPlayerHp,
        });
    }

    const hasScroungeSkill =
        stats.skills.some((skill) => skill.name === "Scrounge") &&
        stats.activeSkills.includes("Scrounge");

    if (hasScroungeSkill) {
        const coinsEarned = Math.floor(Math.random() * (10 - 5 + 1)) + 5;

        await addBalance(
            i.user.id,
            coinsEarned,
            true,
            `Earned from the Scrounge skill`,
        );

        skillsActivated += `\`💸\` Earned \`${coinsEarned}\` ${texts.c.u} with the Scrounge skill.\n`;
    }

    if (skillsActivated) {
        finalEmbed.addFields({
            name: "Skills Activated",
            value: skillsActivated,
        });
    }

    if (dropsCollected.length > 0) {
        const dropsDescription = dropsCollected
            .map((drop) => `\`${drop.amount}x\` ${drop.item}`)
            .join(", ");
        finalEmbed.addFields({
            name: "Drops",
            value: dropsDescription,
        });
    }

    await i.editReply({ embeds: [finalEmbed] }).catch(noop);
    await updateUserStats(i.user.id, { isHunting: false });
    sleep(get.secs(30)).then(() => void thread.delete().catch(noop));

    const hasInsomniaSkill =
        stats.skills.some((skill) => skill.name === "Insomnia") &&
        stats.activeSkills.includes("Insomnia");

    const huntCooldown = hasInsomniaSkill ? get.mins(20) : get.mins(30);
    await cooldowns.set(userWallet, "hunt", huntCooldown);
}

export async function handleDefeat(
    i: ChatInputCommandInteraction,
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentPlayerHp: number,
    userWallet: UserWallet,
) {
    const finalEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle(`Defeat...`)
        .setDescription(
            `Oh no :( You were defeated by the ${monster.name}...\n-# Use </downgrade:1282035993242767450> if this WL is too hard`,
        );

    const amountToDeduct = Math.min(25, userWallet.balance);
    if (amountToDeduct > 0) {
        await removeBalance(
            i.user.id,
            amountToDeduct,
            true,
            `Lost due to defeat`,
        );

        finalEmbed.addFields({
            name: "Loss",
            value: `You lost \`${amountToDeduct}\` coins due to your defeat.`,
        });
    }

    await updateUserStats(i.user.id, {
        hp: Math.max(currentPlayerHp, 0),
        isHunting: false,
    });

    await i.editReply({ embeds: [finalEmbed] }).catch(noop);

    const hasInsomniaSkill =
        stats.skills.some((skill) => skill.name === "Insomnia") &&
        stats.activeSkills.includes("Insomnia");

    const huntCooldown = hasInsomniaSkill ? get.mins(20) : get.mins(30);
    await cooldowns.set(userWallet, "hunt", huntCooldown);

    sleep(get.secs(30)).then(() => void thread.delete().catch(noop));
}

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
    if (stats.equippedWeapon?.toLowerCase().includes("staff of homa")) {
        return handleStaffOfHomaAttack(
            thread,
            stats,
            monster,
            currentMonsterHp,
            vigilanceUsed,
            monsterState,
            isFirstTurn,
        );
    } else if (stats.equippedWeapon?.toLowerCase().includes("aqua simulacra")) {
        return handleAquaSimulacraAttack(
            thread,
            stats,
            monster,
            currentMonsterHp,
            vigilanceUsed,
            monsterState,
            isFirstTurn,
        );
    } else {
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
                `>>> \`⚔️\` You dealt \`${attackPower.toFixed(
                    2,
                )}\` damage to the ${monster.name}${
                    isCrit ? " 💢 (Critical Hit!)" : ""
                }${
                    monsterDefended ? ` 🛡️ (Defended: -${monsterDefValue})` : ""
                }.`,
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
}

export async function monsterAttack(
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentPlayerHp: number,
): Promise<number> {
    let monsterDamage = getRandomValue(monster.minDamage, monster.maxDamage);

    const critChance = monster.critChance || 0;
    const critValue = monster.critValue || 1;
    const isCrit = Math.random() * 100 < critChance;
    if (isCrit) {
        monsterDamage *= critValue;
    }

    const defChance = stats.defChance || 0;
    const defValue = stats.defValue || 0;
    const defended = Math.random() * 100 < defChance;
    if (defended) {
        monsterDamage = Math.max(monsterDamage - defValue, 0);
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
        const healAmount = Math.ceil(monster.maxHp * 0.05);
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
            `>>> \`⚔️\` The ${
                monster.name
            } dealt \`${monsterDamage}\` damage to you${
                defended ? ` 🛡️ (Defended: -${defValue})` : ""
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
        let currentMonsterHp = Math.floor(
            getRandomValue(monster.minHp, monster.maxHp),
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

        const battleEmbed = new EmbedBuilder()
            .setColor("Aqua")
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

        let isMonsterFirst = hasDistraction ? false : Math.random() < 0.5;

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

                currentPlayerHp = stats.hp;

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
        attackPower *= 2;
        await thread
            .send(
                `>>> \`🗡️\` Backstab skill activated! You deal 200% more DMG!`,
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
    monsterState: { displaced: boolean; vanishedUsed: boolean };
}> {
    let attackMissed = false;

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

    const monsterDefChance = monster.defChance || 0;
    const monsterDefValue = monster.defValue || 0;
    const monsterDefended = Math.random() * 100 < monsterDefChance;
    if (monsterDefended) {
        attackPower = Math.max(attackPower - monsterDefValue, 0);
    }

    return { attackPower, attackMissed, monsterState };
}
