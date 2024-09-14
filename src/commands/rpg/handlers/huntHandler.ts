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
    updateUserStats,
} from "../../../services";
import { cooldowns } from "../../../utils";
import {
    calculateDrop,
    calculateExp,
    getEncounterDescription,
    getRandomMonster,
    getRandomValue,
    initializeMonsters,
    type Monster,
} from "../../../utils/hunt";

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
            `You defeated the following monsters: \`${monstersFought}\`!\n-# \`⭐\` \`+${totalExpGained} EXP\` (\`🌍\` WL${stats.worldLevel})`,
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

        finalEmbed.addFields({
            name: "Totem Skill",
            value: `\`💖\` You healed \`${healAmount}\` HP due to the Totem skill.`,
        });

        await updateUserStats(i.user.id, {
            hp: currentPlayerHp,
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

    const hasScroungeSkill =
        stats.skills.some((skill) => skill.name === "Scrounge") &&
        stats.activeSkills.includes("Scrounge");

    if (hasScroungeSkill) {
        const coinsEarned = Math.floor(Math.random() * (15 - 5 + 1)) + 5;

        await addBalance(
            i.user.id,
            coinsEarned,
            true,
            `Earned from the Scrounge skill`,
        );

        finalEmbed.addFields({
            name: "Scrounge Skill",
            value: `\`💸\` You earned \`${coinsEarned}\` coins with the Scrounge skill.`,
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
    displaced: boolean = false,
): Promise<{
    currentMonsterHp: number;
    vigilanceUsed: boolean;
    displaced?: boolean;
}> {
    if (stats.equippedWeapon === "Staff of Homa") {
        return handleStaffOfHomaAttack(
            thread,
            stats,
            monster,
            currentMonsterHp,
            vigilanceUsed,
        );
    } else if (stats.equippedWeapon === "Aqua Simulacra") {
        return handleAquaSimulacraAttack(
            thread,
            stats,
            monster,
            currentMonsterHp,
            vigilanceUsed,
        );
    } else {
        let attackPower = stats.attackPower;

        if (displaced) {
            attackPower *= 0.5;
            displaced = false;
            await thread
                .send(
                    `>>> \`〽️\` You are displaced! Your attack power is reduced by 50%.`,
                )
                .catch(noop);
        }

        const critChance = stats.critChance || 0;
        const critValue = stats.critValue || 1;

        const isCrit = Math.random() * 100 < critChance;
        if (isCrit) {
            attackPower *= critValue;
        }

        const monsterDefChance = monster.defChance || 0;
        const monsterDefValue = monster.defValue || 0;
        const monsterDefended = Math.random() * 100 < monsterDefChance;

        if (monsterDefended) {
            attackPower = Math.max(attackPower - monsterDefValue, 0);
        }

        const isLawachurlOrElectro =
            monster.name.includes("Lawachurl") ||
            monster.name.includes("Electro");
        const stunChance = Math.random() < 0.25;

        if (isLawachurlOrElectro && stunChance) {
            await thread
                .send(
                    `>>> \`💫\` The ${monster.name} stunned you! You missed your attack.`,
                )
                .catch(noop);
            return { currentMonsterHp, vigilanceUsed, displaced };
        }

        const isAnemo = monster.name.includes("Anemo");
        const dodgeChance = Math.random() < 0.25;

        if (isAnemo && dodgeChance) {
            await thread
                .send(
                    `>>> \`💨\` The ${monster.name} dodged your attack with its Anemo agility!`,
                )
                .catch(noop);
        } else {
            currentMonsterHp -= attackPower;
            await thread
                .send(
                    `>>> \`⚔️\` You dealt \`${attackPower.toFixed(
                        2,
                    )}\` damage to the ${monster.name}${
                        isCrit ? " 💢 (Critical Hit!)" : ""
                    }${
                        monsterDefended
                            ? ` 🛡️ (Defended: -${monsterDefValue})`
                            : ""
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

            if (hasVigilance && !vigilanceUsed) {
                const vigilanceAttackPower = attackPower / 2;
                currentMonsterHp -= vigilanceAttackPower;
                vigilanceUsed = true;

                await thread
                    .send(
                        `>>> \`⚔️\` You dealt \`${vigilanceAttackPower.toFixed(
                            2,
                        )}\` damage to the ${
                            monster.name
                        } ✨ (Vigilance Skill).`,
                    )
                    .catch(noop);
            }
        }

        const isFatui = monster.name.includes("Fatui");
        const displacementChance = Math.random() < 0.25;
        if (isFatui && displacementChance) {
            displaced = true;
            await thread
                .send(
                    `>>> \`〽️\` The ${monster.name} displaced you! You will deal 50% less damage next turn.`,
                )
                .catch(noop);
        }

        return { currentMonsterHp, vigilanceUsed, displaced };
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
            ? Math.floor(Math.random() * 3) + 1
            : stats.worldLevel >= 5
              ? Math.floor(Math.random() * 2) + 1
              : 1;

    const monstersEncountered: Monster[] = [];
    let currentPlayerHp = stats.hp;

    for (let encounter = 0; encounter < numberOfMonsters; encounter++) {
        const monster = await getRandomMonster(
            stats.worldLevel,
            stats.location,
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
                    value: createHealthBar(currentPlayerHp, stats.hp),
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
            await thread.send(
                `Another monster has appeared! You are now facing ${monster.name}.`,
            );
        }

        const hasVigilance =
            stats.skills.some((skill) => skill.name === "Vigilance") &&
            stats.activeSkills.includes("Vigilance");

        let vigilanceUsed = false;

        let isMonsterFirst = Math.random() < 0.5;

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
                    monstersEncountered[currentMonsterIndex],
                    currentPlayerHp,
                );

                isMonsterFirst = false;
            } else {
                const result = await playerAttack(
                    thread!,
                    stats,
                    monstersEncountered[currentMonsterIndex],
                    currentMonsterHp,
                    hasVigilance,
                    vigilanceUsed,
                );

                currentMonsterHp = result.currentMonsterHp;
                vigilanceUsed = result.vigilanceUsed;

                if (currentMonsterHp > 0) {
                    currentPlayerHp = await monsterAttack(
                        thread!,
                        stats,
                        monstersEncountered[currentMonsterIndex],
                        currentPlayerHp,
                    );
                }
            }

            const playerHpBar = createHealthBar(currentPlayerHp, stats.hp);
            const monsterHpBar = createHealthBar(
                currentMonsterHp,
                initialMonsterHp,
            );

            if (
                typeof playerHpBar === "string" &&
                typeof monsterHpBar === "string"
            ) {
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
            }

            await i.editReply({ embeds: [battleEmbed] }).catch(noop);
        }, get.secs(4));
    };

    await handleMonsterBattle();
}

async function handleAquaSimulacraAttack(
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentMonsterHp: number,
    vigilanceUsed: boolean,
): Promise<{ currentMonsterHp: number; vigilanceUsed: boolean }> {
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
    let bonusDamage = 0;

    if (emojiCount["💎"]) {
        bonusDamage += attackPower * 0.5 * emojiCount["💎"];
    }

    if (emojiCount["🍀"]) {
        attackPower *= 2 ** emojiCount["🍀"];
    }

    if (Object.values(emojiCount).includes(3)) {
        attackPower *= 100;
        await thread
            .send(
                `>>> \`⚔️\` You dealt \`${attackPower.toFixed(
                    2,
                )}\` damage to the ${monster.name}`,
            )
            .catch(noop);
    } else if (Object.values(emojiCount).includes(2)) {
        attackPower *= stats.critValue || 1;
        await thread
            .send(
                `>>> \`⚔️\` You dealt \`${attackPower.toFixed(
                    2,
                )}\` damage to the ${monster.name}`,
            )
            .catch(noop);
    } else {
        await thread
            .send(
                `>>> \`⚔️\` You dealt \`${attackPower.toFixed(
                    2,
                )}\` damage to the ${monster.name}.`,
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

    return { currentMonsterHp, vigilanceUsed };
}

async function handleStaffOfHomaAttack(
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentMonsterHp: number,
    vigilanceUsed: boolean,
): Promise<{ currentMonsterHp: number; vigilanceUsed: boolean }> {
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

    const currentHpPercentage = stats.hp / stats.maxHP;
    const heartIcon = getHeartIcon(stats.hp, stats.maxHP);

    let damageMultiplier = Math.pow(1 / currentHpPercentage, 2);

    if (currentHpPercentage > 1) {
        damageMultiplier = 0.5;
    }

    let attackPower = stats.attackPower * damageMultiplier;

    const critChance = stats.critChance || 0;
    const critValue = stats.critValue || 1;
    const isCrit = Math.random() * 100 < critChance;
    if (isCrit) {
        attackPower *= critValue;
    }

    const monsterDefChance = monster.defChance || 0;
    const monsterDefValue = monster.defValue || 0;
    const monsterDefended = Math.random() * 100 < monsterDefChance;
    if (monsterDefended) {
        attackPower = Math.max(attackPower - monsterDefValue, 0);
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

    return { currentMonsterHp, vigilanceUsed };
}
