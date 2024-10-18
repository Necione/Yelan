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
    getMonsterByName,
    getRandomMonster,
    getRandomValue,
    initializeMonsters,
    type Monster,
} from "../../../utils/hunt";
import { monsterAttack, playerAttack } from "./battleHandler";
import { handleDefeat, handleVictory } from "./conditions";

export async function handleHunt(
    i: ChatInputCommandInteraction,
    r: Message,
    stats: UserStats,
    userWallet: UserWallet,
) {
    await initializeMonsters();

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
        : stats.worldLevel >= 20
          ? Math.floor(Math.random() * 2) + 3
          : stats.worldLevel === 15
            ? 3
            : stats.worldLevel >= 10
              ? Math.floor(Math.random() * 2) + 2
              : stats.worldLevel >= 5
                ? Math.floor(Math.random() * 2) + 1
                : 1;

    const monstersEncountered: Monster[] = [];

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

    for (let encounter = 0; encounter < numberOfMonsters; encounter++) {
        let monster: Monster | null;

        if (isBossEncounter) {
            monster = await getMonsterByName(bossName);
            if (!monster) {
                throw new Error(`Monster not found: ${bossName}`);
            }
        } else {
            monster = await getRandomMonster(stats.worldLevel, stats.location, {
                currentHp: stats.hp,
                attackPower: stats.attackPower,
                critChance: stats.critChance,
                critValue: stats.critValue,
                defChance: stats.defChance,
                defValue: stats.defValue,
                maxHp: stats.maxHP,
            });
        }

        if (!monster) {
            return;
        }

        if (stats.rebirths >= 2 && Math.random() < 0.05) {
            const modifierType = Math.random() < 0 ? "Mutated" : "Bloodthirsty";
            monster.modifier = modifierType;

            if (modifierType === "Mutated") {
                monster.currentHp = Math.floor(monster.currentHp * 1.5);
            } else if (modifierType === "Bloodthirsty") {
                monster.currentHp = Math.floor(monster.currentHp * 0.75);
            }
        }

        monstersEncountered.push(monster);

        if (isBossEncounter) {
            break;
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

        if (monster.modifier === "Mutated") {
            currentMonsterHp = Math.floor(currentMonsterHp * 1.5);
        } else if (monster.modifier === "Bloodthirsty") {
            currentMonsterHp = Math.floor(currentMonsterHp * 0.75);
        }

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
            .setColor(
                monster.modifier === "Bloodthirsty"
                    ? "#b20303"
                    : monster.modifier === "Mutated"
                      ? "#658e4d"
                      : "Aqua",
            )
            .setTitle(`You encountered a ${monster.modifier} ${monster.name}!`)
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

                const modifier = monster.modifier;

                // Pass modifier to playerAttack if needed
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
                    modifier, // New parameter
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
