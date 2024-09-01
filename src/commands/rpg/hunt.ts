import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get, is, sleep } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    addItemToInventory,
    getProfileByUserId,
    getUserStats,
    updateUserStats,
} from "../../services";
import { cooldowns, locked } from "../../utils";
import { calculateDrop, getRandomValue, monsters } from "../../utils/hunt";

export const hunt = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("hunt")
        .setDescription(
            "[RPG] Go on a hunt to fight monsters and earn rewards.",
        )
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.deferred) {
            return;
        }
        locked.set(i.user);
        const message = await i.fetchReply().catch(() => null);
        if (!message) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(`Unable to fetch the original message.`),
            );
        }
        const userWallet = await getProfileByUserId(i.user.id);
        if (!userWallet) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(`Unable to find/create your user profile.`),
            );
        }

        const cc = cooldowns.get(userWallet, "hunt");
        if (!cc.status) {
            locked.del(i.user.id);
            return r.edit(embedComment(cc.message));
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    `No stats found for you, please setup your profile.`,
                ),
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

        const battleEmbed = new EmbedBuilder()
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

        await r.edit({
            embeds: [battleEmbed],
        });
        const thread = await message
            .startThread({
                name: `Battle with ${monster.name}`,
                autoArchiveDuration: 60,
            })
            .catch(() => null);
        if (!thread) {
            return r.edit(embedComment(`Unable to create the thread.`));
        }

        const battleInterval = setInterval(async () => {
            if (currentPlayerHp <= 0 || currentMonsterHp <= 0) {
                clearInterval(battleInterval);

                const finalEmbed = new EmbedBuilder();
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

                await thread
                    .send(finalEmbed.data.description || "")
                    .catch(() => null);

                await updateUserStats(i.user.id, {
                    hp: Math.max(currentPlayerHp, 0),
                });
                await sleep(get.secs(2));

                if (currentMonsterHp <= 0) {
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
                }

                await r.edit({ embeds: [finalEmbed] });
                sleep(get.secs(30)).then(
                    () => void thread.delete().catch(() => null),
                );
                await cooldowns.set(userWallet, "hunt", get.hrs(1));

                locked.del(i.user.id);
                return;
            }

            currentMonsterHp -= stats.attackPower;
            if (currentMonsterHp < 0) {
                currentMonsterHp = 0;
            }
            await thread
                .send(
                    `>>> \`⚔️\` You dealt ${stats.attackPower} damage to the ${monster.name}!\n${monster.name}'s HP is now ${currentMonsterHp}/${monster.maxHp}.`,
                )
                .catch(() => null);

            if (currentMonsterHp > 0) {
                const monsterDamage = getRandomValue(
                    monster.minDamage,
                    monster.maxDamage,
                );
                currentPlayerHp -= monsterDamage;
                if (currentPlayerHp < 0) {
                    currentPlayerHp = 0;
                }
                await thread
                    .send(
                        `>>> \`⚔️\` The ${monster.name} dealt ${monsterDamage} damage to you!\nYour HP is now ${currentPlayerHp}/${stats.hp}.`,
                    )
                    .catch(() => null);
            }

            battleEmbed.setFields(
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

            await r.edit({ embeds: [battleEmbed] }).catch(() => null);
        }, get.secs(4)); // Don't put this below 4-5s otherwise it will cause the bot to get ratelimited 💀
    },
});
