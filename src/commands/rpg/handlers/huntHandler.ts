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
import {
    EmbedBuilder,
    type ButtonInteraction,
    type ChatInputCommandInteraction,
    type ColorResolvable,
    type Message,
    type PublicThreadChannel,
    type ThreadChannel,
    type User,
} from "discord.js";
import { sendToChannel, skills } from "../../../plugins/other/utils";
import {
    getProfileByUserId,
    syncStats,
    updateUserStats,
} from "../../../services";
import { cooldowns, locked } from "../../../utils";
import type { MutationType } from "../../../utils/helpers/huntHelper";
import {
    generateNextHuntMonsters,
    getEncounterDescription,
    getMonsterByName,
    getMonstersByName,
    type Monster,
} from "../../../utils/helpers/huntHelper";
import { calculateMasteryLevel } from "../../../utils/helpers/masteryHelper";
import { elementEmojis } from "../../../utils/helpers/monsterHelper";
import { handleRandomEvent } from "../../../utils/randomEvents";
import { weapons, type WeaponName } from "../../../utils/rpgitems/weapons";
import { getUserSkillLevelData } from "../../../utils/skillsData";
import {
    getDeathThreshold,
    monsterAttack,
    playerAttack,
} from "./battleHandler";
import { handleDefeat, handleVictory } from "./conditions";

const sinSkills = ["Wrath", "Sloth", "Pride", "Greed"];

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

export async function handleHunt(
    message: Message,
    stats: UserStats,
    userWallet: UserWallet,
    selectedMonstersByName?: string[],
    handlers?: HuntHandlers,
) {
    const start = Date.now();

    if (Math.random() < 0.2) {
        await updateUserStats(stats.userId, { isHunting: false });
        await handleRandomEvent(message, stats, userWallet);
        return;
    }

    let useNextHunt = false;
    let selectedMonsters: Monster[] = [];

    if (stats.nextHunt && stats.nextHunt.length > 0) {
        const parsedMonsters = await Promise.all(
            stats.nextHunt.map(async (rawName) => {
                const [baseName, mutation] = rawName.split("|");
                const monster = await getMonsterByName(baseName.trim());
                if (!monster) {
                    return null;
                }

                if (mutation) {
                    monster.mutationType = mutation as MutationType;
                    monster.name = `${mutation} ${monster.name}`;
                }
                return monster;
            }),
        );
        const validMonsters = parsedMonsters.filter(
            (m) => m !== null,
        ) as Monster[];
        if (validMonsters.length > 0) {
            selectedMonsters = validMonsters;

            await updateUserStats(stats.userId, { nextHunt: { set: [] } });
            useNextHunt = true;
        }
    }

    if (!useNextHunt && is.array(selectedMonstersByName)) {
        selectedMonsters = await getMonstersByName(selectedMonstersByName);
        if (selectedMonsters.length > 0) {
            useNextHunt = true;
        }
    }

    if (!useNextHunt || selectedMonsters.length === 0) {
        selectedMonsters = await generateNextHuntMonsters(stats);
    }

    const bossEncounters: { [key: number]: string } = {
        5: "Electro Hypostasis",
        10: "Cryo Regisvine",
        15: "Rhodeia of Loch",
        20: "Primo Geovishap",
    };
    let isBossEncounter = false;
    let bossName = "";

    if (
        bossEncounters[stats.adventureRank] &&
        !stats.beatenBosses.includes(bossEncounters[stats.adventureRank])
    ) {
        isBossEncounter = true;
        bossName = bossEncounters[stats.adventureRank];
    }

    const monstersEncountered = selectedMonsters;

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
        } else if (
            monster.mutationType === "Infected" ||
            monster.mutationType === "Demonic"
        ) {
            currentMonsterHp = Math.floor(currentMonsterHp * 2);
        }

        const initialMonsterHp = currentMonsterHp;
        monster.startingHp = initialMonsterHp;

        const initialPlayerHp = currentPlayerHp;
        const effectiveMaxHp = currentPlayerHp;

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

        const mutationColors: Record<MutationType, ColorResolvable> = {
            Bloodthirsty: 0xb40000,
            Strange: 0x658e4d,
            Infected: 0x88349b,
            Demonic: 0x28282b,
        };

        const embedColor: ColorResolvable = monster.mutationType
            ? mutationColors[monster.mutationType] || 0xb84df1
            : 0xb84df1;

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

        let vigilanceUsed = false;

        const distractionSkill = getUserSkillLevelData(stats, "Distraction");
        const hasDistraction = distractionSkill;

        let isMonsterFirst: boolean;
        if (monster.mutationType) {
            isMonsterFirst = true;
        } else {
            isMonsterFirst = hasDistraction
                ? Math.random() >= (distractionSkill?.levelData?.priority || 0)
                : Math.random() < 0.5;
        }

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
        const tauntSkill = getUserSkillLevelData(stats, "Taunt");
        const pacifistSkill = getUserSkillLevelData(stats, "Pacifist");

        if (tauntSkill && tauntSkill.level > 0) {
            startingMessages.push("`🎷` The **Taunt** skill is active");
        }

        if (pacifistSkill && pacifistSkill.level > 0) {
            startingMessages.push("`🕊️` The **Pacifist** skill is active");
        }

        if (isWieldingPolearm && polearmMasteryLevel >= 1) {
            startingMessages.push(
                `\`💙\` **Polearm Mastery** activated. Your starting HP is increased by __10%__`,
            );
        }

        if (hasSloth) {
            startingMessages.push(
                `\`💤\` **SIN OF SLOTH** activated. Your starting HP is increased by __25%__`,
            );
        }
        if (hasWrath) {
            startingMessages.push(
                `\`💢\` **SIN OF WRATH** activated. Your starting HP is reduced by __25%__`,
            );
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

                isPlayerTurn = false;
            } else {
                const monsterMessages = make.array<string>();

                ({ currentPlayerHp, currentMonsterHp } = await monsterAttack(
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
                ));

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

                if (currentPlayerHp <= deathThreshold) {
                    break;
                }

                isPlayerTurn = true;
            }
            await sleep(get.secs(0.5));

            stats.hp = currentPlayerHp;
            await updateUserStats(stats.userId, { hp: { set: stats.hp } });

            if (isFirstTurn) {
                isFirstTurn = false;
            }

            turnNumber++;
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
                    if (handlers?.win && typeof handlers?.win === "function") {
                        await handlers.win(
                            message,
                            thread,
                            stats,
                            monstersEncountered,
                            currentPlayerHp,
                            userWallet,
                        );
                    } else {
                        await handleVictory(
                            message,
                            thread,
                            stats,
                            monstersEncountered,
                            currentPlayerHp,
                            userWallet,
                        );
                    }

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
                if (handlers?.lose && typeof handlers?.lose === "function") {
                    await handlers.lose(
                        message,
                        thread,
                        stats,
                        monstersEncountered[currentMonsterIndex],
                        currentPlayerHp,
                        userWallet,
                    );
                } else {
                    await handleDefeat(
                        message,
                        thread,
                        stats,
                        monstersEncountered[currentMonsterIndex],
                        currentPlayerHp,
                        userWallet,
                    );
                }
            }
        }
    };

    await handleMonsterBattle();
}

export async function startHunt(
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

    const activeSinSkills = (stats.activeSkills || []).filter((skill) =>
        sinSkills.includes(skill),
    );

    if (activeSinSkills.length > 1) {
        locked.del(user.id);
        return r.edit(
            embedComment(
                `You cannot go on a hunt while having multiple Sin skills active. Currently active Sin skills: **${activeSinSkills.join(
                    ", ",
                )}**. Please deactivate some Sin skills before hunting.`,
            ),
        );
    }

    if (monsters && monsters.length > 0) {
        await updateUserStats(user.id, {
            nextHunt: { set: [] },
        });
    }

    await updateUserStats(user.id, { isHunting: { set: true } });
    await handleHunt(message, stats, p, monsters, handlers);

    locked.del(user.id);
}

export async function startFishingEncounter(
    message: Message,
    user: User,
    monsters?: string[],
    handlers?: HuntHandlers,
) {
    const r = getMessageResponder(message);

    const p = await getProfileByUserId(user.id);
    if (!p) {
        return r.edit(embedComment("Unable to find/create your user profile."));
    }

    const stats = await syncStats(user.id);
    if (!stats) {
        return r.edit(
            embedComment("No stats found for you, please set up your profile."),
        );
    }

    if (stats.hp <= 0) {
        return r.edit(
            embedComment("You don't have enough HP to fight any monsters!"),
        );
    }

    let result: string | undefined;
    const mergedHandlers: HuntHandlers = {
        win: async (msg, thr, st, mons, hp, wallet) => {
            if (handlers?.win) {
                const val = await handlers.win(msg, thr, st, mons, hp, wallet);

                if (typeof val === "string") {
                    result = val;
                }
            }
        },
        lose: async (msg, thr, st, mon, hp, wallet) => {
            if (handlers?.lose) {
                const val = await handlers.lose(msg, thr, st, mon, hp, wallet);
                if (typeof val === "string") {
                    result = val;
                }
            }
        },
    };

    await handleHunt(message, stats, p, monsters, mergedHandlers);

    return result;
}
