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
    getMonsterByName,
    getRandomValue,
    initializeMonsters,
    type Monster,
} from "../../../utils/hunt";
import { monsterAttack, playerAttack } from "./battleHandler";
import { handleAbyssDefeat, handleAbyssVictory } from "./conditions";

export async function handleAbyssBattle(
    i: ChatInputCommandInteraction,
    r: Message<boolean>,
    stats: UserStats,
    userWallet: UserWallet,
) {
    await initializeMonsters();

    const possibleMonsters = [
        "Large Pyro Slime",
        "Large Cryo Slime",
        "Large Geo Slime",
        "Hilichurl",
        "Mitachurl",
        "Dendro Samachurl",
        "Ruin Scout",
        "Cryo Abyss Mage",
        "Hydro Abyss Mage",
    ];
    let monstersEncountered: Monster[] = [];

    const selectedMonsterName =
        possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];

    const selectedMonster = await getMonsterByName(selectedMonsterName);
    if (!selectedMonster) {
        throw new Error(`Monster not found: ${selectedMonsterName}`);
    }

    monstersEncountered = [selectedMonster];

    let currentPlayerHp = stats.hp;

    const hasSloth =
        stats.skills.some((skill) => skill.name === "Sloth") &&
        stats.activeSkills.includes("Sloth");

    const hasWrath =
        stats.skills.some((skill) => skill.name === "Wrath") &&
        stats.activeSkills.includes("Wrath");

    if (hasSloth) {
        currentPlayerHp = Math.floor(currentPlayerHp * 1.25);
    }

    if (hasWrath) {
        currentPlayerHp = Math.floor(currentPlayerHp * 0.75);
    }

    currentPlayerHp = Math.min(currentPlayerHp, stats.maxHP * 1.5);

    let currentMonsterIndex = 0;

    const handleMonsterBattle = async (thread?: PublicThreadChannel<false>) => {
        const monster = monstersEncountered[currentMonsterIndex];

        const monsterStats = monster.getStatsForWorldLevel(10);
        if (!monsterStats) {
            throw new Error(`Stats not found for monster: ${monster.name}`);
        }
        let currentMonsterHp = Math.floor(
            getRandomValue(monsterStats.minHp, monsterStats.maxHp),
        );

        const initialMonsterHp = currentMonsterHp;
        const initialPlayerHp = currentPlayerHp;

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

        const battleEmbed = new EmbedBuilder()
            .setColor("#b84df1")
            .setTitle(`You encountered a ${monster.name}!`)
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

        let vigilanceUsed = false;

        const isMonsterFirst = true;
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

        const startingMessages: string[] = [];
        if (hasSloth) {
            startingMessages.push(
                `\`💤\` **SIN OF SLOTH** activated. Your starting HP is increased by 25%.`,
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
                    await handleAbyssVictory(
                        i,
                        thread,
                        stats,
                        monstersEncountered,
                        currentPlayerHp,
                    );
                }
            }
        } else {
            if (thread) {
                await handleAbyssDefeat(
                    i,
                    thread,
                    monstersEncountered[currentMonsterIndex],
                    currentPlayerHp,
                );
            }
        }
    };

    await handleMonsterBattle();
}
