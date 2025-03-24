import {
    embedComment,
    get,
    getRandomValue,
    is,
    make,
    noop,
    sleep,
} from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import type {
    ChatInputCommandInteraction,
    Message,
    PublicThreadChannel,
} from "discord.js";
import { EmbedBuilder } from "discord.js";
import { sendToChannel, skills } from "../../../plugins/other/utils";
import { updateUserStats } from "../../../services";
import {
    getMonsterByName,
    initializeMonsters,
    type Monster,
} from "../../../utils/helpers/huntHelper";
import { monsterAttack, playerAttack } from "../handlers/battleHandler";
import { handleAbyssDefeat, handleAbyssVictory } from "../handlers/conditions";
import { floor1Monsters, floor2Monsters } from "./monsterSets";

export async function handleAbyssBattle(
    i: ChatInputCommandInteraction,
    r: Message<boolean>,
    stats: UserStats,
) {
    await initializeMonsters();

    let possibleMonsters = make.array<string>();

    switch (stats.currentAbyssFloor) {
        case 1:
            possibleMonsters = floor1Monsters;
            break;
        case 2:
            possibleMonsters = floor2Monsters;
            break;
        default:
            possibleMonsters = floor1Monsters;
            break;
    }

    let monstersEncountered = make.array<Monster>();

    const selectedMonsterName =
        possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];

    const abyssadventureRank = stats.currentAbyssFloor === 2 ? 15 : 10;

    const selectedMonster = await getMonsterByName(
        selectedMonsterName,
        abyssadventureRank,
    );

    if (!selectedMonster) {
        throw new Error(`Monster not found: ${selectedMonsterName}`);
    }

    monstersEncountered = [selectedMonster];

    let currentPlayerHp = stats.hp;

    const hasSloth = skills.has(stats, "Sloth");

    const hasWrath = skills.has(stats, "Wrath");

    if (hasSloth) {
        currentPlayerHp = Math.floor(currentPlayerHp * 1.25);
    }

    if (hasWrath) {
        currentPlayerHp = Math.floor(currentPlayerHp * 0.75);
    }

    currentPlayerHp = Math.min(currentPlayerHp, stats.maxHP * 1.5);
    let currentMonsterIndex = 0;

    const handleMonsterBattle = async (
        thread?: PublicThreadChannel<false> | null,
    ) => {
        const monster = monstersEncountered[currentMonsterIndex];

        const abyssadventureRank = stats.currentAbyssFloor === 2 ? 15 : 10;
        const monsterStats =
            monster.getStatsForadventureRank(abyssadventureRank);

        if (!monsterStats) {
            throw new Error(`Stats not found for monster: ${monster.name}`);
        }
        let currentMonsterHp = Math.floor(
            getRandomValue(monsterStats.minHp, monsterStats.maxHp),
        );

        const initialMonsterHp = currentMonsterHp;

        const initialPlayerHp = currentPlayerHp;
        const effectiveMaxHp = currentPlayerHp;

        const createHealthBar = (current: number, max: number, length = 20) => {
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

        await i.editReply({ embeds: [battleEmbed] }).catch(noop);

        if (!thread) {
            thread = await r
                .startThread({
                    name: `Battle with ${monster.name}`,
                    autoArchiveDuration: 60,
                })
                .catch(noop);

            if (!thread) {
                await i
                    .editReply(embedComment(`Unable to create the thread.`))
                    .catch(noop);
                return;
            }
        } else {
            await sendToChannel(thread.id, {
                content: `Another monster has appeared! You are now facing ${monster.name}.`,
            });
        }

        const startingMessages = make.array<string>();
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

        // Determine turn order
        let isMonsterFirst = Math.random() < 0.5;

        // If player has Pride skill, monster always goes first
        if (skills.has(stats, "Pride")) {
            isMonsterFirst = true;
            startingMessages.push(
                "`🏅` **SIN OF PRIDE** activated. You will never go first, but deal 250% more damage after the monster's attack.",
            );
        }

        let isPlayerTurn = !isMonsterFirst;

        if (is.array(startingMessages)) {
            if (thread) {
                await sendToChannel(thread.id, {
                    content: `>>> ${startingMessages.join("\n")}`,
                });
            }
        }

        let vigilanceUsed = false;
        let isFirstTurn = true;
        let turnNumber = 1;
        let monsterState = {
            displaced: false,
            vanishedUsed: false,
        };

        const hasCrystallize = skills.has(stats, "Crystallize");
        const hasFatigue = skills.has(stats, "Fatigue");

        while (currentPlayerHp > 0 && currentMonsterHp > 0) {
            if (isPlayerTurn) {
                const playerMessages = make.array<string>();

                const result = await playerAttack(
                    stats,
                    monster,
                    currentPlayerHp,
                    currentMonsterHp,
                    effectiveMaxHp,
                    vigilanceUsed,
                    monsterState,
                    playerMessages,
                    hasWrath,
                );

                currentMonsterHp = result.currentMonsterHp;
                currentPlayerHp = result.currentPlayerHp;
                vigilanceUsed = result.vigilanceUsed;
                monsterState = result.monsterState;

                if (is.array(playerMessages)) {
                    if (thread) {
                        await sendToChannel(thread.id, {
                            content: `>>> ${playerMessages.join("\n")}`,
                        });
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

                isPlayerTurn = false;
            } else {
                const monsterMessages = make.array<string>();

                const {
                    currentPlayerHp: updatedPlayerHp,
                    currentMonsterHp: updatedMonsterHp,
                } = await monsterAttack(
                    stats,
                    monster,
                    currentPlayerHp,
                    currentMonsterHp,
                    monsterMessages,
                    turnNumber,
                    hasCrystallize,
                    hasFatigue,
                    monsterState,
                    effectiveMaxHp,
                );

                currentPlayerHp = updatedPlayerHp;
                currentMonsterHp = updatedMonsterHp;

                if (is.array(monsterMessages)) {
                    if (thread) {
                        await sendToChannel(thread.id, {
                            content: `>>> ${monsterMessages.join("\n")}`,
                        });
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

                if (currentPlayerHp <= 0) {
                    break;
                }

                isPlayerTurn = true;
            }
            await sleep(get.secs(2));

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
