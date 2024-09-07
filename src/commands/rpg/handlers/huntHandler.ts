import { embedComment, get, noop, sleep } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type { ChatInputCommandInteraction, Message } from "discord.js";
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
} from "../../../utils/hunt";

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
        const filledLength = Math.round((current / max) * length);
        const emptyLength = length - filledLength;
        const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);
        return `\`${bar}\` ${current}/${max} HP`;
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
    const hasLeech = stats.skills.some((skill) => skill.name === "Leech");
    let vigilanceUsed = false;

    const battleInterval = setInterval(async () => {
        if (currentPlayerHp <= 0 || currentMonsterHp <= 0) {
            clearInterval(battleInterval);

            const finalEmbed = new EmbedBuilder();
            if (currentPlayerHp > 0) {
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
                    .setTitle(`Victory!`)
                    .setDescription(
                        `You defeated the ${monster.name}!\n-# \`⭐\` \`+${expGained} EXP\` (\`🌍\` WL${stats.worldLevel})`,
                    );
            } else {
                finalEmbed
                    .setColor("Red")
                    .setTitle(`Defeat...`)
                    .setDescription(
                        `Oh no :( You were defeated by the ${monster.name}...\n-# Use </downgrade:1282035993242767450> if this WL is too hard`,
                    );
            }

            await updateUserStats(i.user.id, {
                hp: Math.max(currentPlayerHp, 0),
            });

            if (currentMonsterHp <= 0) {
                const drops = calculateDrop(monster.drops);
                if (Array.isArray(drops)) {
                    await addItemToInventory(i.user.id, drops);

                    const dropsDescription = drops
                        .map((drop) => `\`${drop.amount}x\` ${drop.item}`)
                        .join(", ");
                    finalEmbed.addFields({
                        name: "Drops",
                        value: dropsDescription,
                    });
                }
            }

            await i.editReply({ embeds: [finalEmbed] }).catch(noop);

            await updateUserStats(i.user.id, {
                isHunting: false,
            });

            sleep(get.secs(30)).then(() => void thread.delete().catch(noop));

            await cooldowns.set(userWallet, "hunt", get.mins(30));

            return;
        }

        let attackPower = stats.attackPower;
        const critChance = stats.critChance || 0;
        const critValue = stats.critValue || 1;

        const isCrit = Math.random() * 100 < critChance;
        if (isCrit) {
            attackPower *= critValue;
        }

        if (hasVigilance && !vigilanceUsed) {
            currentMonsterHp -= attackPower;
            await thread
                .send(
                    `>>> \`⚔️\` You dealt \`${attackPower.toFixed(
                        2,
                    )}\` damage to the ${monster.name}.`,
                )
                .catch(noop);

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
        }

        if (hasLeech && Math.random() < 0.5) {
            const leechHeal = Math.ceil(initialMonsterHp * 0.01);
            currentPlayerHp = Math.min(
                currentPlayerHp + leechHeal,
                stats.maxHP,
            );
            await thread
                .send(
                    `>>> \`💖\` You healed \`${leechHeal}\` HP due to the Leech skill.`,
                )
                .catch(noop);
        }

        if (currentMonsterHp < 0) {
            currentMonsterHp = 0;
        }

        let monsterDamage = getRandomValue(
            monster.minDamage,
            monster.maxDamage,
        );

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

        await thread
            .send(
                `>>> \`⚔️\` The ${
                    monster.name
                } dealt \`${monsterDamage}\` damage to you${
                    defended ? ` 🛡️ (Defended: -${defValue})` : ""
                }.`,
            )
            .catch(noop);

        battleEmbed.setFields(
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

        await i.editReply({ embeds: [battleEmbed] }).catch(noop);
    }, get.secs(4));
}
