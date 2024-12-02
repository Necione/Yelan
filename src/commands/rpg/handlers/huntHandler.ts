import {
    embedComment,
    get,
    is,
    make,
    noop,
    sleep,
} from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type {
    ButtonInteraction,
    ChatInputCommandInteraction,
    Message,
    PublicThreadChannel,
} from "discord.js";
import { EmbedBuilder } from "discord.js";
import { sendToChannel, skills } from "../../../plugins/other/utils";
import { updateUserStats } from "../../../services";
import {
    getEncounterDescription,
    getMonsterByName,
    getMonstersByName,
    getRandomMonster,
    getRandomValue,
    initializeMonsters,
    type Monster,
} from "../../../utils/hunt";
import { calculateMasteryLevel } from "../../../utils/masteryHelper";
import { handleRandomEvent } from "../../../utils/randomEvents";
import { type WeaponName, weapons } from "../../../utils/rpgitems/weapons";
import { getUserSkillLevelData } from "../../../utils/skillsData";
import {
    getDeathThreshold,
    monsterAttack,
    playerAttack,
} from "./battleHandler";
import { handleDefeat, handleVictory } from "./conditions";

export type AnyInteraction = ButtonInteraction | ChatInputCommandInteraction;

export async function handleHunt(
    r: Message,
    stats: UserStats,
    userWallet: UserWallet,
    selectedMonstersByName?: string[],
) {
    let selectedMonsters = make.array<Monster>();
    if (is.array(selectedMonstersByName)) {
        selectedMonsters = await getMonstersByName(selectedMonstersByName);
    }
    if (!is.array(selectedMonsters)) {
        // If there is no selected monsters then do this.
        if (Math.random() < 0.1) {
            await handleRandomEvent(r, stats, userWallet);
            await updateUserStats(stats.userId, { isHunting: false });
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

    const currentWorldLevel = stats.worldLevel;
    let isBossEncounter = false;
    let bossName = "";

    if (
        bossEncounters[currentWorldLevel] &&
        !stats.beatenBosses.includes(bossEncounters[currentWorldLevel])
    ) {
        isBossEncounter = true;
        bossName = bossEncounters[currentWorldLevel];
    }

    const numberOfMonsters = isBossEncounter
        ? 1
        : stats.worldLevel <= 5
          ? 1
          : stats.worldLevel <= 15
            ? Math.random() < 0.75
                ? 2
                : 1
            : stats.worldLevel <= 25
              ? Math.random() < 0.75
                  ? 2
                  : 3
              : stats.worldLevel <= 35
                ? Math.random() < 0.5
                    ? 2
                    : 3
                : 3;

    const monstersEncountered = is.array(selectedMonsters)
        ? selectedMonsters
        : make.array<Monster>();

    let currentPlayerHp = stats.hp;

    const hasSloth = skills.has(stats, "Sloth");
    const hasWrath = skills.has(stats, "Wrath");

    const equippedWeaponName = stats.equippedWeapon as WeaponName | undefined;
    const weaponType = equippedWeaponName
        ? weapons[equippedWeaponName]?.type
        : undefined;

    const isWieldingPolearm = weaponType === "Polearm";
    const masteryPoints = stats.masteryPolearm || 0;
    const polearmMastery = calculateMasteryLevel(masteryPoints);
    const polearmMasteryLevel = polearmMastery.numericLevel;

    if (isWieldingPolearm && polearmMasteryLevel >= 1) {
        currentPlayerHp = Math.floor(currentPlayerHp * 1.1);
    }

    if (hasSloth) {
        currentPlayerHp = Math.floor(currentPlayerHp * 1.25);
    }

    if (hasWrath) {
        currentPlayerHp = Math.floor(currentPlayerHp * 0.75);
    }

    currentPlayerHp = Math.min(currentPlayerHp, stats.maxHP * 1.5);
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
            }

            if (!monster) {
                return;
            }

            const mutationChance = stats.rebirths * 5;
            const actualMutationChance = Math.min(mutationChance, 100);
            const isMutated = Math.random() * 100 < actualMutationChance;

            if (isMutated) {
                monster.name = `Mutated ${monster.name}`;
                monster.isMutated = true;
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
        const monsterStats = monster.getStatsForWorldLevel(stats.worldLevel);
        if (!monsterStats) {
            throw new Error(`Stats not found for monster: ${monster.name}`);
        }
        let currentMonsterHp = Math.floor(
            getRandomValue(monsterStats.minHp, monsterStats.maxHp),
        );

        if (monster.isMutated) {
            currentMonsterHp *= 1.2;
        }

        const initialMonsterHp = currentMonsterHp;
        const initialPlayerHp = currentPlayerHp;

        const createHealthBar = (
            current: number,
            max: number,
            deathThreshold: number,
            length: number = 20,
        ): string => {
            const minHP = deathThreshold;
            const cappedCurrent = Math.min(Math.max(current, minHP), max);
            const ratio = (cappedCurrent - minHP) / (max - minHP);
            const filledLength = Math.round(ratio * length);
            const emptyLength = Math.max(length - filledLength, 0);

            const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);
            return `\`${bar}\` ${current.toFixed(2)}/${max.toFixed(2)} HP`;
        };

        const deathThreshold = getDeathThreshold(stats);

        const battleEmbed = new EmbedBuilder()
            .setColor(monster.isMutated ? "#658e4d" : "Aqua")
            .setTitle(`You encountered a ${monster.name}!`)
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

        await r.edit({ embeds: [battleEmbed] }).catch(noop);

        if (!thread) {
            thread =
                (await r
                    .startThread({
                        name: `Battle with ${monster.name}`,
                        autoArchiveDuration: 60,
                    })
                    .catch(noop)) ?? undefined;

            if (!thread) {
                return r
                    .edit(embedComment(`Unable to create the thread.`))
                    .catch(noop);
            }
        } else {
            await sendToChannel(thread.id, {
                content: `Another monster has appeared! You are now facing ${monster.name}.`,
            });
        }

        let vigilanceUsed = false;

        const distractionSkill = getUserSkillLevelData(stats, "Distraction");
        const hasDistraction = distractionSkill;

        const isMonsterFirst = hasDistraction
            ? Math.random() >= (distractionSkill?.levelData?.priority || 0)
            : Math.random() < 0.5;
        let isPlayerTurn = !isMonsterFirst;

        let monsterState = {
            displaced: false,
            vanishedUsed: false,
        };

        let isFirstTurn = true;

        const hasCrystallize = skills.has(stats, "Crystallize");
        const hasFatigue = skills.has(stats, "Fatigue");

        let turnNumber = 1;

        const startingMessages = make.array<string>();

        if (isWieldingPolearm && polearmMasteryLevel >= 1) {
            startingMessages.push(
                `\`💙\` **Polearm Mastery** activated. Your starting HP is increased by 10%.`,
            );
        }

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
            if (thread) {
                await sendToChannel(thread.id, {
                    content: `>>> ${startingMessages.join("\n")}`,
                });
            }
        }

        while (currentPlayerHp > deathThreshold && currentMonsterHp > 0) {
            if (isPlayerTurn) {
                const playerMessages: string[] = [];

                const result = await playerAttack(
                    stats,
                    monster,
                    currentPlayerHp,
                    currentMonsterHp,
                    vigilanceUsed,
                    monsterState,
                    playerMessages,
                    hasWrath,
                );

                currentMonsterHp = result.currentMonsterHp;
                currentPlayerHp = result.currentPlayerHp;
                vigilanceUsed = result.vigilanceUsed;
                monsterState = result.monsterState;

                if (playerMessages.length > 0) {
                    if (thread) {
                        await sendToChannel(thread.id, {
                            content: `>>> ${playerMessages.join("\n")}`,
                        });
                    }
                }

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

                await r.edit({ embeds: [battleEmbed] }).catch(noop);

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
                    hasFatigue,
                    monsterState,
                );

                if (monsterMessages.length > 0) {
                    if (thread) {
                        await sendToChannel(thread.id, {
                            content: `>>> ${monsterMessages.join("\n")}`,
                        });
                    }
                }

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

                await r.edit({ embeds: [battleEmbed] }).catch(noop);

                if (currentPlayerHp <= deathThreshold) {
                    break;
                }

                isPlayerTurn = true;
            }
            await sleep(get.secs(1));

            stats.hp = currentPlayerHp;
            await updateUserStats(stats.userId, { hp: stats.hp });

            if (isFirstTurn) {
                isFirstTurn = false;
            }

            turnNumber++;
        }

        if (currentPlayerHp > deathThreshold) {
            if (currentMonsterIndex < monstersEncountered.length - 1) {
                currentMonsterIndex++;
                await handleMonsterBattle(thread);
            } else {
                if (thread) {
                    await handleVictory(
                        r,
                        thread,
                        stats,
                        monstersEncountered,
                        currentPlayerHp,
                        userWallet,
                    );

                    if (isBossEncounter) {
                        stats.beatenBosses.push(bossName);
                        await updateUserStats(stats.userId, {
                            beatenBosses: stats.beatenBosses,
                        });
                    }
                }
            }
        } else {
            if (thread) {
                await handleDefeat(
                    r,
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
