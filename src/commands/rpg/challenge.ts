import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { noop, sleep } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type ChatInputCommandInteraction,
    type Collection,
    EmbedBuilder,
    type MessageComponentInteraction,
    SlashCommandBuilder,
    TextChannel,
    type ThreadChannel,
} from "discord.js";
import { getUserStats } from "../../services";

async function playerVsPlayerAttack(
    thread: ThreadChannel,
    attackerStats: UserStats,
    defenderStats: UserStats,
    currentDefenderHp: number,
    vigilanceUsed: boolean,
): Promise<{ currentDefenderHp: number; vigilanceUsed: boolean }> {
    let attackPower = attackerStats.attackPower;
    const critChance = attackerStats.critChance || 0;
    const critValue = attackerStats.critValue || 1;

    const isCrit = Math.random() * 100 < critChance;
    if (isCrit) {
        attackPower *= critValue;
    }

    const defenderDefChance = defenderStats.defChance || 0;
    const defenderDefValue = defenderStats.defValue || 0;
    const defenderDefended = Math.random() * 100 < defenderDefChance;

    if (defenderDefended) {
        attackPower = Math.max(attackPower - defenderDefValue, 0);
    }

    currentDefenderHp -= attackPower;
    currentDefenderHp = Math.max(currentDefenderHp, 0);

    await thread
        .send(
            `>>> \`⚔️\` <@${attackerStats.userId}> dealt \`${attackPower.toFixed(
                2,
            )}\` damage to <@${defenderStats.userId}>${
                isCrit ? " 💢 (Critical Hit!)" : ""
            }${
                defenderDefended ? ` 🛡️ (Defended: -${defenderDefValue})` : ""
            }.`,
        )
        .catch(noop);

    const hasVigilance = attackerStats.skills.some(
        (skill) => skill.name === "Vigilance",
    );

    if (hasVigilance && !vigilanceUsed) {
        const vigilanceAttackPower = attackPower / 2;
        currentDefenderHp -= vigilanceAttackPower;
        currentDefenderHp = Math.max(currentDefenderHp, 0);

        await thread
            .send(
                `>>> \`⚔️\` Vigilance activated! <@${attackerStats.userId}> dealt an additional \`${vigilanceAttackPower.toFixed(
                    2,
                )}\` damage to <@${defenderStats.userId}>.`,
            )
            .catch(noop);

        vigilanceUsed = true;
    }

    const hasLeechSkill = attackerStats.skills.some(
        (skill) => skill.name === "Leech",
    );
    const leechTriggered = Math.random() < 0.5;
    if (hasLeechSkill && leechTriggered) {
        const healAmount = Math.ceil(defenderStats.maxHP * 0.05);
        attackerStats.hp = Math.min(
            attackerStats.hp + healAmount,
            attackerStats.maxHP,
        );

        await thread
            .send(
                `>>> \`💖\` Leech skill activated! <@${attackerStats.userId}> healed \`${healAmount}\` HP.`,
            )
            .catch(noop);
    }

    return { currentDefenderHp, vigilanceUsed };
}

export const challenge = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("challenge")
        .setDescription("[RPG] Challenge another player to a fight!")
        .addUserOption((option) =>
            option
                .setName("opponent")
                .setDescription("The player you want to challenge.")
                .setRequired(true),
        ),
    async execute(i: ChatInputCommandInteraction) {
        const opponent = i.options.getUser("opponent");
        if (!opponent) {
            return i.reply("You need to choose an opponent!");
        }

        const [challengerStats, opponentStats] = await Promise.all([
            getUserStats(i.user.id),
            getUserStats(opponent.id),
        ]);

        if (!challengerStats || !opponentStats) {
            return i.reply("Both players need valid stats to fight!");
        }

        const channel = i.channel;
        if (!channel || !(channel instanceof TextChannel)) {
            return i.reply("This command can only be used in text channels.");
        }

        const challengeEmbed = new EmbedBuilder()
            .setColor(0x00ffff)
            .setTitle("Challenge Request!")
            .setDescription(
                `<@${i.user.id}> has challenged <@${opponent.id}> to a duel!`,
            )
            .setFooter({ text: "You have 10 seconds to respond." });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("accept")
                .setLabel("Accept")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("decline")
                .setLabel("Decline")
                .setStyle(ButtonStyle.Danger),
        );

        const message = await i.reply({
            content: `<@${opponent.id}>`,
            embeds: [challengeEmbed],
            components: [row],
            fetchReply: true,
        });

        const filter = (interaction: {
            user: { id: string };
            customId: string;
        }) =>
            interaction.user.id === opponent.id &&
            ["accept", "decline"].includes(interaction.customId);

        const collector = message.createMessageComponentCollector({
            filter,
            time: 10000,
        });

        collector.on(
            "collect",
            async (interaction: MessageComponentInteraction) => {
                if (interaction.customId === "accept") {
                    await interaction.update({
                        content: `<@${opponent.id}> accepted the challenge!`,
                        components: [],
                    });

                    let challengerHp = challengerStats.maxHP * 2;
                    let opponentHp = opponentStats.maxHP * 2;

                    const thread = await channel.threads.create({
                        name: `Challenge: ${i.user.username} vs ${opponent.username}`,
                        autoArchiveDuration: 60,
                    });

                    if (!thread) {
                        return i.reply("Failed to create challenge thread.");
                    }

                    const createHealthBar = (
                        current: number,
                        max: number,
                        length: number = 20,
                    ): string => {
                        const filledLength = Math.round(
                            (current / max) * length,
                        );
                        const emptyLength = length - filledLength;
                        return `\`${
                            "█".repeat(filledLength) + "░".repeat(emptyLength)
                        }\` ${current.toFixed(2)}/${max.toFixed(2)} HP`;
                    };

                    const battleEmbed = new EmbedBuilder()
                        .setColor(0x00ffff)
                        .setTitle(
                            `Fight Progress: ${i.user.username} vs ${opponent.username}`,
                        )
                        .addFields(
                            {
                                name: `${i.user.username}'s HP`,
                                value: createHealthBar(
                                    challengerHp,
                                    challengerStats.maxHP * 2,
                                ),
                                inline: true,
                            },
                            {
                                name: `${opponent.username}'s HP`,
                                value: createHealthBar(
                                    opponentHp,
                                    opponentStats.maxHP * 2,
                                ),
                                inline: true,
                            },
                        );

                    const battleMessage = await thread.send({
                        embeds: [battleEmbed],
                    });

                    let challengerVigilanceUsed = false;
                    let opponentVigilanceUsed = false;
                    let turn = true;

                    while (challengerHp > 0 && opponentHp > 0) {
                        if (turn) {
                            const {
                                currentDefenderHp: newOpponentHp,
                                vigilanceUsed: updatedVigilanceUsed,
                            } = await playerVsPlayerAttack(
                                thread,
                                challengerStats,
                                opponentStats,
                                opponentHp,
                                challengerVigilanceUsed,
                            );
                            opponentHp = newOpponentHp;
                            challengerVigilanceUsed = updatedVigilanceUsed;
                        } else {
                            const {
                                currentDefenderHp: newChallengerHp,
                                vigilanceUsed: updatedVigilanceUsed,
                            } = await playerVsPlayerAttack(
                                thread,
                                opponentStats,
                                challengerStats,
                                challengerHp,
                                opponentVigilanceUsed,
                            );
                            challengerHp = newChallengerHp;
                            opponentVigilanceUsed = updatedVigilanceUsed;
                        }

                        const challengerHpBar = createHealthBar(
                            challengerHp,
                            challengerStats.maxHP * 2,
                        );
                        const opponentHpBar = createHealthBar(
                            opponentHp,
                            opponentStats.maxHP * 2,
                        );

                        const updatedEmbed = new EmbedBuilder()
                            .setColor(0x00ffff)
                            .setTitle(
                                `Fight Progress: ${i.user.username} vs ${opponent.username}`,
                            )
                            .addFields(
                                {
                                    name: `${i.user.username}'s HP`,
                                    value: challengerHpBar,
                                    inline: true,
                                },
                                {
                                    name: `${opponent.username}'s HP`,
                                    value: opponentHpBar,
                                    inline: true,
                                },
                            );

                        await battleMessage
                            .edit({ embeds: [updatedEmbed] })
                            .catch(noop);

                        turn = !turn;
                        await sleep(4000);
                    }

                    const winner =
                        challengerHp > 0 ? i.user.username : opponent.username;
                    await thread
                        .send(`🎉 **${winner} wins the battle!**`)
                        .catch(noop);
                    await thread.setArchived(true).catch(noop);
                } else {
                    await interaction.update({
                        content: `<@${opponent.id}> declined the challenge.`,
                        components: [],
                    });
                }
            },
        );

        collector.on(
            "end",
            async (
                collected: Collection<string, MessageComponentInteraction>,
                reason: string,
            ) => {
                if (reason === "time") {
                    await i.editReply({
                        content: `<@${opponent.id}> did not respond in time.`,
                        components: [],
                    });
                }
            },
        );
    },
});
