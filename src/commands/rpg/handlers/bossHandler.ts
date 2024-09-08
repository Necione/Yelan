import { get, noop } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import type {
    ChatInputCommandInteraction,
    Interaction,
    Message,
    User,
} from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    NewsChannel,
    TextChannel,
    ThreadChannel,
} from "discord.js";
import {
    addItemToInventory,
    getUserStats,
    updateUserStats,
} from "../../../services";
import {
    calculateDrop,
    getRandomBoss,
    getRandomValue,
    type Monster,
} from "../../../utils/hunt";

async function handleVictory(
    r: Message,
    boss: Monster,
    playerStats: { user: User; stats: UserStats }[],
) {
    const victoryEmbed = new EmbedBuilder()
        .setTitle(`Victory!`)
        .setDescription(`The boss **${boss.name}** has been defeated!`)
        .setColor("Green")
        .setThumbnail(boss.image);

    const validPlayerStats = playerStats.filter(
        (player) => player.stats !== null,
    ) as { user: User; stats: UserStats }[];

    for (const player of validPlayerStats) {
        const userStats = player.stats;
        if (!userStats) {
            continue;
        }

        const expGained = Math.floor(getRandomValue(boss.minExp, boss.maxExp));
        let newExp = userStats.exp + expGained;
        let expRequired = 20 * Math.pow(1.2, userStats.worldLevel - 1);

        while (newExp >= expRequired) {
            newExp -= expRequired;
            userStats.worldLevel += 1;
            expRequired = 20 * Math.pow(1.2, userStats.worldLevel - 1);
        }

        await updateUserStats(player.user.id, {
            exp: newExp,
            worldLevel: userStats.worldLevel,
        });

        const drops = calculateDrop(boss.drops);
        let lootDescription = "No loot.";
        if (Array.isArray(drops)) {
            await addItemToInventory(player.user.id, drops);
            lootDescription = drops
                .map((drop) => `\`${drop.amount}x\` ${drop.item}`)
                .join(", ");
        }

        victoryEmbed.setDescription(
            `**<@${player.user.id}>** Gains:\n**XP:** ${expGained}\n**Loot:** ${lootDescription}`,
        );

        await updateUserStats(player.user.id, {
            isHunting: false,
        });
    }

    if (r.channel?.isTextBased() && "send" in r.channel) {
        await r.channel.send({ embeds: [victoryEmbed] }).catch(noop);
    } else {
        console.error("The channel does not support sending messages.");
    }
}

export async function handleBossFight(
    i: ChatInputCommandInteraction,
    r: Message,
    stats: UserStats,
) {
    const joinEmbed = new EmbedBuilder()
        .setTitle("A Sudden Chill Fills the Air...")
        .setDescription(
            "A piercing gust of wind cuts through the silence. You feel a presence looming, as if something ancient and powerful is coming...",
        )
        .setColor("Aqua");

    const joinButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("Position 1")
            .setLabel("First Position")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("Position 2")
            .setLabel("Second Position")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("Position 3")
            .setLabel("Third Position")
            .setStyle(ButtonStyle.Primary),
    );

    const message = await i.editReply({
        embeds: [joinEmbed],
        components: [joinButtons],
    });
    const filter = (interaction: Interaction) =>
        interaction.isButton() &&
        !players.some((p) => p.user.id === interaction.user.id);

    const collector = message.createMessageComponentCollector({
        filter,
        time: 30000,
    });

    const players: { user: User; position: string }[] = [];

    collector.on("collect", async (interaction) => {
        const position = interaction.customId;

        if (!players.some((player) => player.user.id === interaction.user.id)) {
            players.push({ user: interaction.user, position });

            await updateUserStats(interaction.user.id, { isHunting: true });

            await interaction.update({
                embeds: [
                    joinEmbed.setDescription(
                        `A piercing gust of wind cuts through the silence. You feel a presence looming, as if something ancient and powerful is coming...\n\n` +
                            players
                                .map((p) => `<@${p.user.id}> in ${p.position}`)
                                .join("\n"),
                    ),
                ],
                components: [joinButtons],
            });
        }

        if (players.length === 3) {
            collector.stop();
        }
    });

    collector.on("end", async () => {
        if (players.length === 0) {
            return i.editReply({
                content: "No players joined the fight.",
                components: [],
            });
        }

        const boss = await getRandomBoss(stats.worldLevel);
        if (!boss) {
            return i.editReply({
                content: "No available bosses for this world level.",
                components: [],
            });
        }

        let currentBossHp = Math.floor(getRandomValue(boss.minHp, boss.maxHp));
        const initialBossHp = currentBossHp;

        const createHealthBar = (
            current: number,
            max: number,
            length = 20,
        ): string => {
            const filledLength = Math.round((current / max) * length);
            const emptyLength = length - filledLength;
            return `\`${"█".repeat(filledLength)}${"░".repeat(
                emptyLength,
            )}\` ${current.toFixed(2)}/${max.toFixed(2)} HP`;
        };

        const battleEmbed = new EmbedBuilder()
            .setTitle(`${boss.name}`)
            .setDescription(`${boss.name} has appeared! Get ready to fight!`)
            .setThumbnail(boss.image)
            .setColor("Red");

        await i.editReply({ embeds: [battleEmbed], components: [] });

        const playerStats = await Promise.all(
            players.map(async (player) => {
                const userStats = await getUserStats(player.user.id);
                return { user: player.user, stats: userStats };
            }),
        );

        let turn = 0;

        const battleInterval = setInterval(async () => {
            let playerMessages = "";
            let bossMessages = "";
            let allPlayersDefeated = false;

            for (let position = 0; position < players.length; position++) {
                const player = playerStats[position];
                if (!player?.stats) {
                    continue;
                }

                let attackPower = player.stats.attackPower;
                const critChance = player.stats.critChance || 0;
                const critValue = player.stats.critValue || 1;
                const isCrit = Math.random() * 100 < critChance;
                if (isCrit) {
                    attackPower *= critValue;
                }

                currentBossHp = Math.max(currentBossHp - attackPower, 0);

                playerMessages += `> \`⚔️\` **<@${
                    player.user.id
                }>** attacked the boss dealing \`${attackPower.toFixed(
                    2,
                )}\` damage${isCrit ? " 💢 (Critical Hit!)" : ""}.\n`;

                const hasLeech = player.stats.skills.some(
                    (skill) => skill.name === "Leech",
                );
                if (hasLeech && Math.random() < 0.5) {
                    const leechHeal = Math.ceil(player.stats.maxHP * 0.01);
                    player.stats.hp = Math.min(
                        player.stats.hp + leechHeal,
                        player.stats.maxHP,
                    );
                    await updateUserStats(player.user.id, {
                        hp: player.stats.hp,
                    });

                    playerMessages += `> \`💖\` **<@${player.user.id}>** healed for \`${leechHeal}\` HP due to the Leech skill!\n`;
                }

                if (currentBossHp <= 0) {
                    clearInterval(battleInterval);
                    const validPlayerStats = playerStats.filter(
                        (player) => player.stats !== null,
                    ) as { user: User; stats: UserStats }[];
                    await handleVictory(r, boss, validPlayerStats);
                    return;
                }
            }

            if (
                r.channel instanceof TextChannel ||
                r.channel instanceof ThreadChannel ||
                r.channel instanceof NewsChannel
            ) {
                await r.channel.send(playerMessages).catch(noop);
            }

            setTimeout(async () => {
                const attackAllPlayers = Math.random() < 0.25;
                if (attackAllPlayers) {
                    for (const player of playerStats) {
                        if (!player?.stats) {
                            continue;
                        }

                        let bossDamage = getRandomValue(
                            boss.minDamage,
                            boss.maxDamage,
                        );
                        const defChance = player.stats.defChance || 0;
                        const defValue = player.stats.defValue || 0;
                        const defended = Math.random() * 100 < defChance;
                        if (defended) {
                            bossDamage = Math.max(bossDamage - defValue, 0);
                        }

                        player.stats.hp = Math.max(
                            player.stats.hp - bossDamage,
                            0,
                        );
                        await updateUserStats(player.user.id, {
                            hp: player.stats.hp,
                        });

                        bossMessages += `> \`⚔️\` The ${
                            boss.name
                        } attacks **<@${
                            player.user.id
                        }>** dealing \`${bossDamage.toFixed(2)}\` damage${
                            defended
                                ? ` 🛡️ (Defended: -${defValue.toFixed(2)})`
                                : ""
                        }!\n`;

                        if (player.stats.hp <= 0) {
                            bossMessages += `> \`💀\` **<@${player.user.id}>** has been defeated!\n`;
                            await updateUserStats(player.user.id, {
                                isHunting: false,
                            });

                            playerStats.splice(playerStats.indexOf(player), 1);
                            if (playerStats.length === 0) {
                                allPlayersDefeated = true;
                                break;
                            }
                        }
                    }
                } else {
                    const targetPlayer = playerStats[turn % playerStats.length];
                    if (targetPlayer?.stats) {
                        let bossDamage = getRandomValue(
                            boss.minDamage,
                            boss.maxDamage,
                        );
                        const defChance = targetPlayer.stats.defChance || 0;
                        const defValue = targetPlayer.stats.defValue || 0;
                        const defended = Math.random() * 100 < defChance;
                        if (defended) {
                            bossDamage = Math.max(bossDamage - defValue, 0);
                        }

                        targetPlayer.stats.hp = Math.max(
                            targetPlayer.stats.hp - bossDamage,
                            0,
                        );

                        await updateUserStats(targetPlayer.user.id, {
                            hp: targetPlayer.stats.hp,
                        });

                        bossMessages += `> \`⚔️\` The ${
                            boss.name
                        } attacks **<@${
                            targetPlayer.user.id
                        }>** dealing \`${bossDamage.toFixed(2)}\` damage${
                            defended
                                ? ` 🛡️ (Defended: -${defValue.toFixed(2)})`
                                : ""
                        }!\n`;

                        if (targetPlayer.stats.hp <= 0) {
                            bossMessages += `> \`💀\` **<@${targetPlayer.user.id}>** has been defeated!\n`;
                            await updateUserStats(targetPlayer.user.id, {
                                isHunting: false,
                            });

                            playerStats.splice(turn % playerStats.length, 1);

                            if (playerStats.length === 0) {
                                allPlayersDefeated = true;
                            }
                        }
                    }
                }

                if (
                    r.channel instanceof TextChannel ||
                    r.channel instanceof ThreadChannel ||
                    r.channel instanceof NewsChannel
                ) {
                    await r.channel.send(bossMessages).catch(noop);
                }

                if (allPlayersDefeated) {
                    clearInterval(battleInterval);
                    if (
                        r.channel instanceof TextChannel ||
                        r.channel instanceof ThreadChannel ||
                        r.channel instanceof NewsChannel
                    ) {
                        await r.channel
                            .send(
                                "All players have been defeated. The boss wins!",
                            )
                            .catch(noop);
                    }
                    return;
                }

                const playerHealthBars = playerStats
                    .filter((p) => p.stats !== null)
                    .map(
                        (p) =>
                            `<@${p.user.id}>: ${createHealthBar(
                                p.stats!.hp,
                                p.stats!.maxHP,
                            )}`,
                    )
                    .join("\n");

                battleEmbed.setDescription(
                    `Boss HP: ${createHealthBar(
                        currentBossHp,
                        initialBossHp,
                    )}\n\nPlayer Health:\n${playerHealthBars}`,
                );

                await i.editReply({ embeds: [battleEmbed] }).catch(noop);

                turn++;
            }, get.secs(4));
        }, get.secs(8));
    });
}
