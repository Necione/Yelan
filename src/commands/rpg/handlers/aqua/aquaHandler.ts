import {
    colors,
    embedComment,
    get,
    getMessageResponder,
    getRandomValue,
    is,
    make,
    ms,
    noop,
    sleep,
} from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type {
    ButtonInteraction,
    ChatInputCommandInteraction,
    ColorResolvable,
    Message,
    PublicThreadChannel,
    ThreadChannel,
    User,
} from "discord.js";
import { EmbedBuilder } from "discord.js";
import { sendToChannel } from "../../../../plugins/other/utils";
import {
    getProfileByUserId,
    syncStats,
    updateUserStats,
} from "../../../../services";
import { cooldowns, locked } from "../../../../utils";
import {
    getEncounterDescription,
    getMonsterByName,
    getMonstersByName,
    getRandomMonster,
    initializeMonsters,
    type Monster,
} from "../../../../utils/helpers/huntHelper";
import { elementEmojis } from "../../../../utils/helpers/monsterHelper";
import { handleRandomEvent } from "../../../../utils/randomEvents";
import { getUserSkillLevelData } from "../../../../utils/skillsData";
import { getDeathThreshold } from "../battleHandler";
import { handleDefeat, handleVictory } from "../conditions";
import { type Card, createDeck, shuffleDeck, type Suit } from "./card";

export type AnyInteraction = ButtonInteraction | ChatInputCommandInteraction;

export type HuntHandlers = {
    win?: (
        message: Message,
        thread: ThreadChannel,
        stats: UserStats,
        monstersEncountered: Monster[],
        currentPlayerHp: number,
        userWallet: UserWallet,
    ) => Promise<unknown> | unknown;
    lose?: (
        message: Message,
        thread: ThreadChannel,
        stats: UserStats,
        monster: Monster,
        currentPlayerHp: number,
        userWallet: UserWallet,
    ) => Promise<unknown> | unknown;
};

const suitEmojis: Record<Suit, string> = {
    Hearts: "♥️",
    Diamonds: "♦️",
    Clubs: "♣️",
    Spades: "♠️",
};

async function sendBattleMessage(
    thread: PublicThreadChannel | undefined,
    content: string,
    delay: number = 3000,
): Promise<void> {
    if (thread) {
        await sendToChannel(thread.id, { content: `>>> ${content}` });
        await sleep(delay);
    }
}

function evaluateHand(cards: Card[]): number {
    const ranks = [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
        "A",
    ];
    const rankValues: Record<string, number> = {
        "2": 2,
        "3": 3,
        "4": 4,
        "5": 5,
        "6": 6,
        "7": 7,
        "8": 8,
        "9": 9,
        "10": 10,
        J: 11,
        Q: 12,
        K: 13,
        A: 14,
    };

    const rankCount: Record<string, number> = {};
    const suitCount: Record<string, number> = {};

    for (const card of cards) {
        rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
        suitCount[card.suit] = (suitCount[card.suit] || 0) + 1;
    }

    const isFlush = Object.values(suitCount).some((count) => count >= 5);
    const sortedRanks = cards
        .map((card) => rankValues[card.rank])
        .sort((a, b) => b - a);
    const uniqueRanks = Array.from(new Set(sortedRanks));

    let isStraight = false;
    let highestStraight = 0;
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        const window = uniqueRanks.slice(i, i + 5);
        if (window[0] - window[4] === 4) {
            isStraight = true;
            highestStraight = window[0];
            break;
        }
    }

    if (
        !isStraight &&
        uniqueRanks.includes(14) &&
        uniqueRanks.includes(2) &&
        uniqueRanks.includes(3) &&
        uniqueRanks.includes(4) &&
        uniqueRanks.includes(5)
    ) {
        isStraight = true;
        highestStraight = 5;
    }

    let isStraightFlush = false;
    if (isFlush && isStraight) {
        const flushSuit = Object.keys(suitCount).find(
            (suit) => suitCount[suit] >= 5,
        );
        if (flushSuit) {
            const flushCards = cards
                .filter((card) => card.suit === flushSuit)
                .map((card) => rankValues[card.rank])
                .sort((a, b) => b - a);
            const uniqueFlushRanks = Array.from(new Set(flushCards));
            for (let i = 0; i <= uniqueFlushRanks.length - 5; i++) {
                const window = uniqueFlushRanks.slice(i, i + 5);
                if (window[0] - window[4] === 4) {
                    isStraightFlush = true;
                    highestStraight = window[0];
                    break;
                }
            }

            if (
                !isStraightFlush &&
                uniqueFlushRanks.includes(14) &&
                uniqueFlushRanks.includes(2) &&
                uniqueFlushRanks.includes(3) &&
                uniqueFlushRanks.includes(4) &&
                uniqueFlushRanks.includes(5)
            ) {
                isStraightFlush = true;
                highestStraight = 5;
            }
        }
    }

    let handRank = 0;

    if (isStraightFlush) {
        handRank = 9 + highestStraight / 100;
    } else {
        const pairs = Object.values(rankCount).filter(
            (count) => count === 2,
        ).length;
        const triples = Object.values(rankCount).filter(
            (count) => count === 3,
        ).length;
        const quads = Object.values(rankCount).filter(
            (count) => count === 4,
        ).length;

        if (quads === 1) {
            handRank =
                8 +
                Math.max(
                    ...uniqueRanks.filter(
                        (rank) => rankCount[ranks[rank - 2]] === 4,
                    ),
                ) /
                    100;
        } else if (triples === 1 && pairs >= 1) {
            handRank =
                7 +
                Math.max(
                    ...uniqueRanks.filter(
                        (rank) => rankCount[ranks[rank - 2]] === 3,
                    ),
                ) /
                    100;
        } else if (isFlush) {
            handRank = 6 + sortedRanks[0] / 100;
        } else if (isStraight) {
            handRank = 5 + highestStraight / 100;
        } else if (triples === 1) {
            handRank =
                4 +
                Math.max(
                    ...uniqueRanks.filter(
                        (rank) => rankCount[ranks[rank - 2]] === 3,
                    ),
                ) /
                    100;
        } else if (pairs >= 2) {
            const pairRanks = uniqueRanks
                .filter((rank) => rankCount[ranks[rank - 2]] === 2)
                .sort((a, b) => b - a);
            handRank = 3 + pairRanks[0] / 100 + pairRanks[1] / 10000;
        } else if (pairs === 1) {
            handRank =
                2 +
                Math.max(
                    ...uniqueRanks.filter(
                        (rank) => rankCount[ranks[rank - 2]] === 2,
                    ),
                ) /
                    100;
        } else {
            handRank = 1 + sortedRanks[0] / 100;
        }
    }

    return handRank;
}

function getBestHand(cards: Card[]): { rank: number; handName: string } {
    const combinations = getCombinations(cards, 5);
    let bestRank = 0;
    let bestHandName = "High Card";

    for (const combo of combinations) {
        const rank = evaluateHand(combo);
        if (rank > bestRank) {
            bestRank = rank;
            bestHandName = getHandName(rank);
        }
    }

    return { rank: bestRank, handName: bestHandName };
}

function getCombinations<T>(array: T[], k: number): T[][] {
    const results = make.array<T[]>();
    const combination = make.array<T>();

    function backtrack(start: number) {
        if (combination.length === k) {
            results.push([...combination]);
            return;
        }
        for (let i = start; i < array.length; i++) {
            combination.push(array[i]);
            backtrack(i + 1);
            combination.pop();
        }
    }

    backtrack(0);
    return results;
}

function getHandName(rank: number): string {
    if (rank >= 9) {
        return "Straight Flush";
    }
    if (rank >= 8) {
        return "Four of a Kind";
    }
    if (rank >= 7) {
        return "Full House";
    }
    if (rank >= 6) {
        return "Flush";
    }
    if (rank >= 5) {
        return "Straight";
    }
    if (rank >= 4) {
        return "Three of a Kind";
    }
    if (rank >= 3) {
        return "Two Pair";
    }
    if (rank >= 2) {
        return "One Pair";
    }
    return "High Card";
}

function assignCards(): {
    playerCards: Card[];
    monsterCards: Card[];
    communityCards: Card[];
} {
    const deck = createDeck();
    const shuffledDeck = shuffleDeck(deck);
    const playerCards = shuffledDeck.slice(0, 2);
    const monsterCards = shuffledDeck.slice(2, 4);
    const communityCards = shuffledDeck.slice(4, 9);
    return { playerCards, monsterCards, communityCards };
}

export async function handleAquaHunt(
    message: Message,
    stats: UserStats,
    userWallet: UserWallet,
    selectedMonstersByName?: string[],
    handlers?: HuntHandlers,
) {
    const start = Date.now();
    let selectedMonsters = make.array<Monster>();
    if (is.array(selectedMonstersByName)) {
        selectedMonsters = await getMonstersByName(selectedMonstersByName);
    }
    if (!is.array(selectedMonsters)) {
        if (Math.random() < 0.2) {
            await updateUserStats(stats.userId, { isHunting: false });
            await handleRandomEvent(message, stats, userWallet);
            return;
        }
        await initializeMonsters();
    }

    const bossEncounters: { [key: number]: string } = {
        5: "Electro Hypostasis",
        10: "Cryo Regisvine",
        15: "Rhodeia of Loch",
        20: "Primo Geovishap",
    };

    const currentAdventureRank = stats.adventureRank;
    let isBossEncounter = false;
    let bossName = "";

    if (
        bossEncounters[currentAdventureRank] &&
        !stats.beatenBosses.includes(bossEncounters[currentAdventureRank])
    ) {
        isBossEncounter = true;
        bossName = bossEncounters[currentAdventureRank];
    }

    let numberOfMonsters = isBossEncounter
        ? 1
        : stats.adventureRank <= 5
          ? 1
          : stats.adventureRank <= 15
            ? Math.random() < 0.75
                ? 2
                : 1
            : stats.adventureRank <= 25
              ? Math.random() < 0.75
                  ? 2
                  : 3
              : stats.adventureRank <= 35
                ? Math.random() < 0.5
                    ? 2
                    : 3
                : 3;

    const tauntSkill = getUserSkillLevelData(stats, "Taunt");

    if (tauntSkill && tauntSkill.level > 0) {
        numberOfMonsters += 1;
    }

    const monstersEncountered = is.array(selectedMonsters)
        ? selectedMonsters
        : make.array<Monster>();

    let currentPlayerHp = stats.hp;

    if (!is.array(selectedMonsters)) {
        for (let encounter = 0; encounter < numberOfMonsters; encounter++) {
            let monster: Monster | null;

            if (isBossEncounter) {
                monster = await getMonsterByName(bossName);
                if (!monster) {
                    throw new Error(`Monster not found: ${bossName}`);
                }
            } else {
                monster = await getRandomMonster(
                    stats.adventureRank,
                    stats.location,
                    {
                        startingHp: stats.hp,
                        attackPower: stats.attackPower,
                        critChance: stats.critChance,
                        critValue: stats.critValue,
                        defChance: stats.defChance,
                        defValue: stats.defValue,
                        maxHp: stats.maxHP,
                        rebirths: stats.rebirths,
                    },
                );
            }

            if (!monster) {
                return;
            }

            const mutationChance = stats.rebirths * 5;
            const actualMutationChance = Math.min(mutationChance, 100);

            const isMutated = Math.random() * 100 < actualMutationChance;

            if (isMutated) {
                const mutationTypes = [
                    "Bloodthirsty",
                    "Strange",
                    "Infected",
                    "Hard",
                ] as const;
                const chosenMutation =
                    mutationTypes[
                        Math.floor(Math.random() * mutationTypes.length)
                    ];

                monster.mutationType = chosenMutation;

                switch (chosenMutation) {
                    case "Bloodthirsty":
                        monster.name = `Bloodthirsty ${monster.name}`;
                        break;
                    case "Strange":
                        monster.name = `Strange ${monster.name}`;
                        break;
                    case "Infected":
                        monster.name = `Infected ${monster.name}`;
                        break;
                }
            }

            monstersEncountered.push(monster);

            if (isBossEncounter) {
                break;
            }
        }
    }

    let currentMonsterIndex = 0;

    const handleMonsterBattle = async (thread?: PublicThreadChannel<false>) => {
        const monster = monstersEncountered[currentMonsterIndex];
        const selectedDescription = getEncounterDescription(
            monster.name,
            stats.location,
        );
        const monsterStats = monster.getStatsForadventureRank(
            stats.adventureRank,
        );
        if (!monsterStats) {
            throw new Error(`Stats not found for monster: ${monster.name}`);
        }
        let currentMonsterHp = Math.floor(
            getRandomValue(monsterStats.minHp, monsterStats.maxHp),
        );

        if (monster.mutationType === "Strange") {
            currentMonsterHp = Math.floor(currentMonsterHp * 1.5);
        } else if (monster.mutationType === "Infected") {
            currentMonsterHp = Math.floor(currentMonsterHp * 2);
        }

        const initialMonsterHp = currentMonsterHp;
        monster.startingHp = initialMonsterHp;

        const initialPlayerHp = currentPlayerHp;

        const createHealthBar = (
            current: number,
            max: number,
            deathThreshold: number,
            length = 20,
        ): string => {
            const minHP = deathThreshold;
            const cappedCurrent = Math.min(Math.max(current, minHP), max);
            const ratio = (cappedCurrent - minHP) / (max - minHP);
            const filledLength = Math.round(ratio * length);
            const emptyLength = Math.max(length - filledLength, 0);

            const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);
            if (current <= 0) {
                current = 0;
            }
            return `\`${bar}\` ${current.toFixed(2)}/${max.toFixed(2)} HP`;
        };

        const deathThreshold = getDeathThreshold(stats);

        let embedColor: ColorResolvable = 0xb84df1;
        if (monster.mutationType === "Bloodthirsty") {
            embedColor = 0xb40000;
        }
        if (monster.mutationType === "Strange") {
            embedColor = 0x658e4d;
        }
        if (monster.mutationType === "Infected") {
            embedColor = 0x88349b;
        }

        let displayedMonsterName = monster.name;
        const element = monster.element;
        if (element && elementEmojis[element]) {
            displayedMonsterName = `${elementEmojis[element]} ${displayedMonsterName}`;
        }

        const battleEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`You encountered a ${displayedMonsterName}!`)
            .setDescription(selectedDescription)
            .setThumbnail(monster.image)
            .addFields(
                {
                    name: "Your HP",
                    value: createHealthBar(
                        currentPlayerHp,
                        initialPlayerHp,
                        deathThreshold,
                    ),
                    inline: true,
                },
                {
                    name: "Monster HP",
                    value: createHealthBar(
                        currentMonsterHp,
                        initialMonsterHp,
                        0,
                    ),
                    inline: true,
                },
            );

        await message.edit({ embeds: [battleEmbed] }).catch(noop);

        if (!thread) {
            thread =
                (await message
                    .startThread({
                        name: `Battle with ${monster.name}`,
                        autoArchiveDuration: 60,
                    })
                    .catch(noop)) ?? undefined;

            if (!thread) {
                return message
                    .edit(embedComment(`Unable to create the thread.`))
                    .catch(noop);
            }
        } else {
            await sendToChannel(thread.id, {
                content: `Another monster has appeared! You are now facing ${monster.name}.`,
            });
        }

        const startingMessages = make.array<string>();

        if (tauntSkill && tauntSkill.level > 0) {
            startingMessages.push("`🎷` The **Taunt** skill is active");
        }

        if (is.array(startingMessages)) {
            if (thread) {
                await sendToChannel(thread.id, {
                    content: `>>> ${startingMessages.join("\n")}`,
                });
            }
        }

        let endedByTime = false;
        const timeBy = get.mins(10);
        while (currentPlayerHp > deathThreshold && currentMonsterHp > 0) {
            if (Date.now() - start >= timeBy) {
                endedByTime = true;
                break;
            }

            const { playerCards, monsterCards, communityCards } = assignCards();

            const playerTotalCards = [...playerCards, ...communityCards];
            const monsterTotalCards = [...monsterCards, ...communityCards];

            const playerBestHand = getBestHand(playerTotalCards);
            const monsterBestHand = getBestHand(monsterTotalCards);

            let winner: "player" | "monster" | "tie" = "tie";
            if (playerBestHand.rank > monsterBestHand.rank) {
                winner = "player";
            } else if (monsterBestHand.rank > playerBestHand.rank) {
                winner = "monster";
            }

            const stage1 = [
                `**Your Hand:** ${playerCards.map(formatCard).join(", ")}`,
                `**${monster.name}'s Hand:** ${monsterCards
                    .map(formatCard)
                    .join(", ")}`,
            ].join("\n");
            await sendBattleMessage(thread, stage1);

            const stage2 = `**Community Cards:** ${communityCards
                .map(formatCard)
                .join(", ")}`;
            await sendBattleMessage(thread, stage2, 3000);

            const battleMessages: string[] = [];

            if (winner === "player") {
                currentMonsterHp -= 999999;
                currentMonsterHp = Math.max(currentMonsterHp, 0);
                battleMessages.push(
                    `\`⚔️\` You won the battle with a **${playerBestHand.handName}** and dealt \`999999\` damage to the ${monster.name}!`,
                );
            } else if (winner === "monster") {
                currentPlayerHp -= 999999;
                currentPlayerHp = Math.max(currentPlayerHp, 0);
                battleMessages.push(
                    `\`⚔️\` The ${monster.name} won the battle with a **${monsterBestHand.handName}** and dealt \`999999\` damage to you!`,
                );
            } else {
                battleMessages.push(`\`🤝\` It's a tie! No damage dealt.`);
            }

            stats.hp = currentPlayerHp;
            await updateUserStats(stats.userId, { hp: { set: stats.hp } });

            const stage3 = battleMessages.join("\n");
            await sendBattleMessage(thread, stage3, 3000);

            const playerHpBar = createHealthBar(
                currentPlayerHp,
                initialPlayerHp,
                deathThreshold,
            );
            const monsterHpBar = createHealthBar(
                currentMonsterHp,
                initialMonsterHp,
                0,
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

            await message.edit({ embeds: [battleEmbed] }).catch(noop);

            if (currentMonsterHp <= 0 && currentPlayerHp > deathThreshold) {
                if (currentMonsterIndex < monstersEncountered.length - 1) {
                    currentMonsterIndex++;
                    await handleMonsterBattle(thread);
                    return;
                } else {
                    if (thread) {
                        await (handlers?.win &&
                        typeof handlers.win === "function"
                            ? handlers.win(
                                  message,
                                  thread,
                                  stats,
                                  monstersEncountered,
                                  currentPlayerHp,
                                  userWallet,
                              )
                            : handleVictory(
                                  message,
                                  thread,
                                  stats,
                                  monstersEncountered,
                                  currentPlayerHp,
                                  userWallet,
                              ));
                    }

                    if (isBossEncounter) {
                        stats.beatenBosses.push(bossName);
                        await updateUserStats(stats.userId, {
                            beatenBosses: stats.beatenBosses,
                        });
                    }
                }
            } else if (currentPlayerHp <= deathThreshold) {
                if (thread) {
                    await (handlers?.lose && typeof handlers.lose === "function"
                        ? handlers.lose(
                              message,
                              thread,
                              stats,
                              monstersEncountered[currentMonsterIndex],
                              currentPlayerHp,
                              userWallet,
                          )
                        : handleDefeat(
                              message,
                              thread,
                              stats,
                              monstersEncountered[currentMonsterIndex],
                              currentPlayerHp,
                              userWallet,
                          ));
                }
                return;
            }

            await sleep(get.secs(1));
        }

        if (endedByTime) {
            await updateUserStats(stats.userId, { isHunting: false });
            try {
                await cooldowns.del(
                    await getProfileByUserId(stats.userId),
                    "hunt",
                );
            } catch {
                noop;
            }
            if (thread) {
                await sendToChannel(thread.id, {
                    content: `>>> 🛑 Ended due to being over ${ms.convert(
                        timeBy / 1000,
                    )} in battle.`,
                });
                await sleep(get.secs(2));
                await thread.edit({ archived: true, locked: true }).catch(noop);
            }
            battleEmbed.setColor(colors.red).setFields([
                {
                    name: "Hunt Ended",
                    value: `Due to the hunt being above ${ms.convert(
                        timeBy / 1000,
                    )} in battle.`,
                },
            ]);
            await message
                .edit({ embeds: [battleEmbed], components: [] })
                .catch(noop);
            return;
        }

        if (currentPlayerHp > deathThreshold) {
            if (currentMonsterIndex < monstersEncountered.length - 1) {
                currentMonsterIndex++;
                await handleMonsterBattle(thread);
            } else {
                if (thread) {
                    await (handlers?.win && typeof handlers.win === "function"
                        ? handlers.win(
                              message,
                              thread,
                              stats,
                              monstersEncountered,
                              currentPlayerHp,
                              userWallet,
                          )
                        : handleVictory(
                              message,
                              thread,
                              stats,
                              monstersEncountered,
                              currentPlayerHp,
                              userWallet,
                          ));
                }

                if (isBossEncounter) {
                    stats.beatenBosses.push(bossName);
                    await updateUserStats(stats.userId, {
                        beatenBosses: stats.beatenBosses,
                    });
                }
            }
        } else {
            if (thread) {
                await (handlers?.lose && typeof handlers.lose === "function"
                    ? handlers.lose(
                          message,
                          thread,
                          stats,
                          monstersEncountered[currentMonsterIndex],
                          currentPlayerHp,
                          userWallet,
                      )
                    : handleDefeat(
                          message,
                          thread,
                          stats,
                          monstersEncountered[currentMonsterIndex],
                          currentPlayerHp,
                          userWallet,
                      ));
            }
        }
    };

    await handleMonsterBattle();
}

export async function startAquaHunt(
    message: Message,
    user: User,
    monsters?: string[],
    handlers?: HuntHandlers,
) {
    const r = getMessageResponder(message);
    locked.set(user, "hunt");

    const p = await getProfileByUserId(user.id);
    if (!p) {
        locked.del(user.id);
        return r.edit(embedComment("Unable to find/create your user profile."));
    }

    const cc = cooldowns.get(p, "hunt");
    if (!cc.status) {
        locked.del(user.id);
        return r.edit(embedComment(cc.message));
    }

    const stats = await syncStats(user.id);
    if (!stats) {
        locked.del(user.id);
        return r.edit(
            embedComment("No stats found for you, please set up your profile."),
        );
    }

    if (stats.isTravelling) {
        locked.del(user.id);
        return r.edit(
            embedComment("You cannot go on a hunt while you are travelling!"),
        );
    }

    if (stats.isHunting) {
        locked.del(user.id);
        return r.edit(embedComment("You are already hunting!"));
    }

    if (stats.abyssMode) {
        locked.del(user.id);
        return r.edit(
            embedComment("You cannot start a hunt while in The Spiral Abyss!"),
        );
    }

    if (stats.hp <= 0) {
        locked.del(user.id);
        return r.edit(
            embedComment("You don't have enough HP to go on a hunt :("),
        );
    }

    await updateUserStats(user.id, { isHunting: { set: true } });
    await handleAquaHunt(message, stats, p, monsters, handlers);

    locked.del(user.id);
}

function formatCard(card: Card): string {
    return `\`${card.rank}${suitEmojis[card.suit]}\``;
}
