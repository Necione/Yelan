import { embedComment, get, is, noop, sleep } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type {
    ChatInputCommandInteraction,
    Message,
    ThreadChannel,
} from "discord.js";
import { EmbedBuilder } from "discord.js";
import { addItemToInventory, updateUserStats } from "../../../services";
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

async function handleVictory(
    i: ChatInputCommandInteraction,
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentPlayerHp: number,
    userWallet: UserWallet,
) {
    const finalEmbed = new EmbedBuilder();
    const expGained = calculateExp(monster.minExp, monster.maxExp);
    let newExp = stats.exp + expGained;
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

    finalEmbed
        .setColor("Green")
        .setTitle(`Victory in ${stats.location}!`)
        .setDescription(
            `You defeated the ${monster.name}!\n-# \`⭐\` \`+${expGained} EXP\` (\`🌍\` WL${stats.worldLevel})`,
        )
        .setThumbnail(monster.image);

    const hasTotemSkill = stats.skills.some((skill) => skill.name === "Totem");
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

    const drops = calculateDrop(monster.drops);
    if (is.array(drops)) {
        await addItemToInventory(i.user.id, drops);

        const dropsDescription = drops
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

    const hasInsomniaSkill = stats.skills.some(
        (skill) => skill.name === "Insomnia",
    );
    const huntCooldown = hasInsomniaSkill ? get.mins(20) : get.mins(30);
    await cooldowns.set(userWallet, "hunt", huntCooldown);
}

async function handleDefeat(
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
    await cooldowns.set(userWallet, "hunt", get.mins(30));
    sleep(get.secs(30)).then(() => void thread.delete().catch(noop));
}

async function playerAttack(
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentMonsterHp: number,
    initialMonsterHp: number,
    hasVigilance: boolean,
    vigilanceUsed: boolean,
): Promise<{ currentMonsterHp: number; vigilanceUsed: boolean }> {
    let attackPower = stats.attackPower;
    const critChance = stats.critChance || 0;
    const critValue = stats.critValue || 1;

    console.log(`[DEBUG] Player attack power: ${attackPower}`);

    const isCrit = Math.random() * 100 < critChance;
    if (isCrit) {
        attackPower *= critValue;
    }

    console.log(
        `[DEBUG] Is crit: ${isCrit}, Attack power after crit: ${attackPower}`,
    );

    const isAnemo = monster.name.includes("Anemo");
    const dodgeChance = Math.random() < 0.25;

    if (isAnemo && dodgeChance) {
        await thread
            .send(
                `>>> \`💨\` The ${monster.name} dodged your attack with its Anemo agility!`,
            )
            .catch(noop);
        console.log(`[DEBUG] The monster dodged the player's attack.`);
    } else {
        currentMonsterHp -= attackPower;
        await thread
            .send(
                `>>> \`⚔️\` You dealt \`${attackPower.toFixed(
                    2,
                )}\` damage to the ${monster.name}${
                    isCrit ? " 💢 (Critical Hit!)" : ""
                }.`,
            )
            .catch(noop);

        console.log(
            `[DEBUG] Player dealt ${attackPower} damage to the monster.`,
        );

        if (hasVigilance && !vigilanceUsed) {
            const vigilanceAttackPower = attackPower / 2;
            currentMonsterHp -= vigilanceAttackPower;
            vigilanceUsed = true;

            await thread
                .send(
                    `>>> \`⚔️\` You dealt \`${vigilanceAttackPower.toFixed(
                        2,
                    )}\` damage to the ${monster.name} ✨ (Vigilance Skill).`,
                )
                .catch(noop);

            console.log(
                `[DEBUG] Vigilance attack triggered. Dealt ${vigilanceAttackPower} damage (half of attackPower).`,
            );
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

    currentPlayerHp -= monsterDamage;
    if (currentPlayerHp < 0) {
        currentPlayerHp = 0;
    }

    const hasLeechSkill = stats.skills.some((skill) => skill.name === "Leech");
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

    const monster = await getRandomMonster(stats.worldLevel, stats.location);

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

    const selectedDescription = getEncounterDescription(
        monster.name,
        stats.location,
    );
    let currentPlayerHp = stats.hp;
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

    const thread = await r
        .startThread({
            name: `Battle with ${monster.name}`,
            autoArchiveDuration: 60,
        })
        .catch(noop);

    if (!thread) {
        return i
            .editReply(embedComment(`Unable to create the thread.`))
            .catch(noop);
    }

    const hasVigilance = stats.skills.some(
        (skill) => skill.name === "Vigilance",
    );
    let vigilanceUsed = false;

    const battleInterval = setInterval(async () => {
        if (currentPlayerHp <= 0 || currentMonsterHp <= 0) {
            clearInterval(battleInterval);

            if (currentPlayerHp > 0) {
                await handleVictory(
                    i,
                    thread,
                    stats,
                    monster,
                    currentPlayerHp,
                    userWallet,
                );
            } else {
                await handleDefeat(
                    i,
                    thread,
                    stats,
                    monster,
                    currentPlayerHp,
                    userWallet,
                );
            }

            return;
        }

        const result = await playerAttack(
            thread,
            stats,
            monster,
            currentMonsterHp,
            initialMonsterHp,
            hasVigilance,
            vigilanceUsed,
        );

        currentMonsterHp = result.currentMonsterHp;
        vigilanceUsed = result.vigilanceUsed;

        if (currentMonsterHp > 0) {
            currentPlayerHp = await monsterAttack(
                thread,
                stats,
                monster,
                currentPlayerHp,
            );
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
}
