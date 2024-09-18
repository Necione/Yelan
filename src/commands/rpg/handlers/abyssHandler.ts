import { embedComment, get, noop, sleep } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import type {
    ChatInputCommandInteraction,
    Message,
    PublicThreadChannel,
    ThreadChannel,
} from "discord.js";
import { EmbedBuilder } from "discord.js";
import { addItemToInventory, updateUserStats } from "../../../services";
import {
    getDropsForAbyssFloor,
    getMonstersForAbyssFloor,
    getRandomValue,
    initializeAbyssMonsters,
    type Monster,
} from "../../../utils/hunt";

export async function handleAbyssVictory(
    i: ChatInputCommandInteraction,
    thread: ThreadChannel,
    stats: UserStats,
) {
    const finalEmbed = new EmbedBuilder();
    let dropsCollected: { item: string; amount: number }[] = [];

    const customFloorDrops = await getDropsForAbyssFloor(stats.abyssFloor);
    if (customFloorDrops.length > 0) {
        dropsCollected = dropsCollected.concat(customFloorDrops);

        await addItemToInventory(i.user.id, customFloorDrops);
    }

    const newAbyssFloor = stats.abyssFloor + 1;

    await updateUserStats(i.user.id, {
        abyssFloor: newAbyssFloor,
    });

    finalEmbed
        .setColor("DarkPurple")
        .setTitle(`Abyss Floor Cleared!`)
        .setDescription(`You have progressed to Abyss Floor ${newAbyssFloor}.`)
        .setThumbnail("https://lh.elara.workers.dev/rpg/abyss.png");

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
}

export async function handleAbyssDefeat(
    i: ChatInputCommandInteraction,
    thread: ThreadChannel,
    currentPlayerHp: number,
) {
    const finalEmbed = new EmbedBuilder()
        .setColor("DarkPurple")
        .setTitle(`Defeat...`)
        .setThumbnail("https://lh.elara.workers.dev/rpg/abyss.png")
        .setDescription(
            `Maybe try again when you become a little bit stronger...`,
        );

    await updateUserStats(i.user.id, {
        hp: Math.max(currentPlayerHp, 0),
        isHunting: false,
    });

    await i.editReply({ embeds: [finalEmbed] }).catch(noop);

    sleep(get.secs(30)).then(() => void thread.delete().catch(noop));
}

async function playerAttack(
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentMonsterHp: number,
    hasVigilance: boolean,
    vigilanceUsed: boolean,
): Promise<{ currentMonsterHp: number; vigilanceUsed: boolean }> {
    let attackPower = stats.attackPower;
    const critChance = stats.critChance || 0;
    const critValue = stats.critValue || 1;

    const abyssLevel = stats.abyssFloor || 0;
    const damageReductionMultiplier = Math.max(1 - abyssLevel * 0.01, 0);

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

    const isCrit = Math.random() * 100 < critChance;
    if (isCrit) {
        attackPower *= critValue;
    }

    attackPower *= damageReductionMultiplier;

    const monsterDefChance = monster.defChance || 0;
    const monsterDefValue = monster.defValue || 0;
    const monsterDefended = Math.random() * 100 < monsterDefChance;

    if (monsterDefended) {
        attackPower = Math.max(attackPower - monsterDefValue, 0);
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
        return { currentMonsterHp, vigilanceUsed };
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
                    monsterDefended ? ` 🛡️ (Defended: -${monsterDefValue})` : ""
                }${abyssLevel > 0 ? `🔻 (${abyssLevel}% Corruption)` : ""}.`,
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
    }

    return { currentMonsterHp, vigilanceUsed };
}

async function monsterAttack(
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

export async function handleAbyssHunt(
    i: ChatInputCommandInteraction,
    r: Message,
    stats: UserStats,
) {
    await initializeAbyssMonsters();

    const abyssMonstersEncountered: Monster[] = [];
    let currentPlayerHp = stats.hp;

    const abyssMonsters = await getMonstersForAbyssFloor(stats.abyssFloor);

    if (abyssMonsters.length === 0) {
        await i
            .editReply(
                embedComment(
                    `This Abyss Floor (${stats.abyssFloor}) has no monsters to encounter.`,
                ),
            )
            .catch(noop);

        await updateUserStats(i.user.id, {
            isHunting: false,
        });

        return;
    }

    abyssMonsters.forEach((abyssMonster) => {
        const convertedMonster: Monster = {
            ...abyssMonster,
            currentHp: Math.floor(
                getRandomValue(abyssMonster.minHp, abyssMonster.maxHp),
            ),
            group: "SpiralAbyss",
            minWorldLevel: stats.worldLevel,
            minExp: 0,
            maxExp: 0,
            drops: [],
            locations: [stats.location],
        };

        abyssMonstersEncountered.push(convertedMonster);
    });

    let currentMonsterIndex = 0;

    const handleAbyssMonsterBattle = async (
        thread?: PublicThreadChannel<false>,
    ) => {
        const abyssMonster = abyssMonstersEncountered[currentMonsterIndex];
        let currentMonsterHp = Math.floor(
            getRandomValue(abyssMonster.minHp, abyssMonster.maxHp),
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
            .setColor("DarkPurple")
            .setTitle(`You encountered a ${abyssMonster.name}!`)
            .setDescription("You feel a slight headache as you descend down...")
            .setThumbnail(abyssMonster.image)
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
                        name: `Battle with ${abyssMonster.name}`,
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
                `Another monster has appeared! You are now facing ${abyssMonster.name}.`,
            );
        }

        const hasVigilance =
            stats.skills.some((skill) => skill.name === "Vigilance") &&
            stats.activeSkills.includes("Vigilance");

        let vigilanceUsed = false;

        const battleInterval = setInterval(async () => {
            if (currentPlayerHp <= 0 || currentMonsterHp <= 0) {
                clearInterval(battleInterval);

                if (currentPlayerHp > 0) {
                    if (
                        currentMonsterIndex <
                        abyssMonstersEncountered.length - 1
                    ) {
                        currentMonsterIndex++;
                        await handleAbyssMonsterBattle(thread);
                    } else {
                        if (thread) {
                            await handleAbyssVictory(i, thread, stats);
                        }
                    }
                } else {
                    if (thread) {
                        await handleAbyssDefeat(i, thread, currentPlayerHp);
                    }
                }

                return;
            }

            if (currentMonsterHp > 0) {
                currentPlayerHp = await monsterAttack(
                    thread!,
                    stats,
                    abyssMonstersEncountered[currentMonsterIndex],
                    currentPlayerHp,
                );
            }

            if (currentPlayerHp > 0 && currentMonsterHp > 0) {
                const result = await playerAttack(
                    thread!,
                    stats,
                    abyssMonstersEncountered[currentMonsterIndex],
                    currentMonsterHp,
                    hasVigilance,
                    vigilanceUsed,
                );

                currentMonsterHp = result.currentMonsterHp;
                vigilanceUsed = result.vigilanceUsed;
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

    await handleAbyssMonsterBattle();
}
