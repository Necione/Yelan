import type { SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get } from "@elara-services/utils";
import { EmbedBuilder, Message, SlashCommandBuilder } from "discord.js";
import {
    addItemToInventory,
    getProfileByUserId,
    getUserStats,
    updateUserStats,
} from "../../services";
import { cooldowns, locked } from "../../utils";
import { calculateDrop, getRandomValue, monsters } from "../../utils/hunt";

export const hunt: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("hunt")
        .setDescription(
            "[RPG] Go on a hunt to fight monsters and earn rewards.",
        )
        .setDMPermission(false),
    defer: { silent: false },
    async execute(interaction, responder) {
        if (!interaction.deferred) {
            return;
        }
        locked.set(interaction);

        const userId = interaction.user.id;
        const userWallet = await getProfileByUserId(userId);
        if (!userWallet) {
            locked.del(interaction.user.id);
            return responder.edit(
                "No profile found for your user. Please set up your profile.",
            );
        }

        const cooldownCheck = cooldowns.get(userWallet, "hunt");
        if (!cooldownCheck.status) {
            locked.del(interaction.user.id);
            return responder.edit(embedComment(cooldownCheck.message));
        }

        const stats = await getUserStats(userId);
        if (!stats) {
            locked.del(interaction.user.id);
            return responder.edit(
                "No stats found for your user. Please set up your profile.",
            );
        }

        const monster = monsters[Math.floor(Math.random() * monsters.length)];
        let currentPlayerHp = stats.hp;
        let currentMonsterHp = getRandomValue(monster.minHp, monster.maxHp);

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

        let battleEmbed = new EmbedBuilder()
            .setColor("Aqua")
            .setTitle(`You encountered a ${monster.name}!`)
            .setDescription(
                `**Battle Start!**\nYou encountered a ${monster.name} with ${currentMonsterHp} HP!`,
            )
            .setThumbnail(monster.image)
            .addFields(
                {
                    name: "Your HP",
                    value: createHealthBar(currentPlayerHp, stats.hp),
                    inline: true,
                },
                {
                    name: "Monster HP",
                    value: createHealthBar(currentMonsterHp, monster.maxHp),
                    inline: true,
                },
            );

        const sentMessage = (await responder.edit({
            embeds: [battleEmbed],
        })) as Message;
        const thread = await sentMessage.startThread({
            name: `Battle with ${monster.name}`,
            autoArchiveDuration: 60,
        });

        const battleInterval = setInterval(async () => {
            if (currentPlayerHp <= 0 || currentMonsterHp <= 0) {
                clearInterval(battleInterval);

                let finalEmbed = new EmbedBuilder();
                if (currentPlayerHp > 0) {
                    finalEmbed
                        .setColor("Green")
                        .setTitle(`Victory!`)
                        .setDescription(`You defeated the ${monster.name}!`)
                        .setThumbnail(
                            `https://lh.elara.workers.dev/rpg/aexp.png`,
                        );
                } else {
                    finalEmbed
                        .setColor("Red")
                        .setTitle(`Defeat...`)
                        .setDescription(
                            `You were defeated by the ${monster.name}...`,
                        );
                }

                await thread.send(finalEmbed.data.description || "");

                await updateUserStats(interaction.user.id, {
                    hp: Math.max(currentPlayerHp, 0),
                });

                if (currentMonsterHp <= 0) {
                    const drops = calculateDrop(monster.drops);
                    if (drops.length > 0) {
                        for (const drop of drops) {
                            await addItemToInventory(
                                interaction.user.id,
                                drop.item,
                                drop.amount,
                            );
                        }

                        const dropsDescription = drops
                            .map((drop) => `\`${drop.amount}x\` ${drop.item}`)
                            .join(", ");
                        finalEmbed.addFields({
                            name: "Drops",
                            value: dropsDescription,
                        });
                    }
                }

                await sentMessage.edit({ embeds: [finalEmbed] });

                setTimeout(async () => {
                    await thread.delete();
                }, 30000);

                await cooldowns.set(userWallet, "hunt", get.hrs(1));

                locked.del(interaction.user.id);
                return;
            }

            currentMonsterHp -= stats.attackPower;
            if (currentMonsterHp < 0) currentMonsterHp = 0;
            await thread.send(
                `>>> \`⚔️\` You dealt ${stats.attackPower} damage to the ${monster.name}!\n${monster.name}'s HP is now ${currentMonsterHp}/${monster.maxHp}.`,
            );

            if (currentMonsterHp > 0) {
                const monsterDamage = getRandomValue(
                    monster.minDamage,
                    monster.maxDamage,
                );
                currentPlayerHp -= monsterDamage;
                if (currentPlayerHp < 0) currentPlayerHp = 0;
                await thread.send(
                    `>>> \`⚔️\` The ${monster.name} dealt ${monsterDamage} damage to you!\nYour HP is now ${currentPlayerHp}/${stats.hp}.`,
                );
            }

            battleEmbed = battleEmbed.setFields(
                {
                    name: "Your HP",
                    value: createHealthBar(currentPlayerHp, stats.hp),
                    inline: true,
                },
                {
                    name: "Monster HP",
                    value: createHealthBar(currentMonsterHp, monster.maxHp),
                    inline: true,
                },
            );

            await sentMessage.edit({ embeds: [battleEmbed] });
        }, 2000);
    },
};
