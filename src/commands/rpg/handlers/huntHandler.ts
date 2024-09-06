import { embedComment, get, sleep } from "@elara-services/utils";
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
} from "../../../utils/hunt";

export async function handleHunt(
    i: ChatInputCommandInteraction,
    r: Message,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const monster = getRandomMonster(stats.worldLevel, stats.location);

    if (!monster) {
        await i
            .editReply(
                embedComment(
                    `This area (${stats.location}) has no monsters to encounter.`,
                ),
            )
            .catch(() => null);
        return;
    }

    const selectedDescription = getEncounterDescription(
        monster.name,
        stats.location,
    );
    let currentPlayerHp = stats.hp;

    const levelDifference = stats.worldLevel - monster.minWorldLevel;
    let hpMultiplier = 1;

    if (levelDifference > 0) {
        hpMultiplier = Math.pow(1.5, levelDifference);
    }

    let currentMonsterHp = Math.floor(
        getRandomValue(monster.minHp, monster.maxHp) * hpMultiplier,
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
        .catch(() => null);

    const thread = await r
        .startThread({
            name: `Battle with ${monster.name}`,
            autoArchiveDuration: 60,
        })
        .catch(() => null);
    if (!thread) {
        return i
            .editReply(embedComment(`Unable to create the thread.`))
            .catch(() => null);
    }

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
                        `You were defeated by the ${monster.name}...`,
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

            await i.editReply({ embeds: [finalEmbed] }).catch(() => null);
            sleep(get.secs(30)).then(
                () => void thread.delete().catch(() => null),
            );

            await cooldowns.set(userWallet, "hunt", get.hrs(1));

            return;
        }

        currentMonsterHp -= stats.attackPower;
        if (currentMonsterHp < 0) {
            currentMonsterHp = 0;
        }

        const monsterDamage = getRandomValue(
            monster.minDamage,
            monster.maxDamage,
        );
        currentPlayerHp -= monsterDamage;
        if (currentPlayerHp < 0) {
            currentPlayerHp = 0;
        }

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

        await i.editReply({ embeds: [battleEmbed] }).catch(() => null);
    }, get.secs(4));
}
