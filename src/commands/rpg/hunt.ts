import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get, is, sleep } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    addBalance,
    addItemToInventory,
    getProfileByUserId,
    getUserStats,
    updateUserStats,
} from "../../services";
import { cooldowns, locked } from "../../utils";
import {
    calculateDrop,
    calculateExp,
    getLiyueEncounterDescription,
    getRandomMonster,
    getRandomValue,
} from "../../utils/hunt";

export const hunt = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("hunt")
        .setDescription(
            "[RPG] Go on a hunt to fight monsters and earn rewards.",
        )
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
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

        if (stats.hp <= 0) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    `You don't have enough HP to go on a hunt. Visit a Statue of the Seven first!`,
                ),
            );
        }

        if (Math.random() < 0.20) {
            const rarities = [
                { rarity: "Common", multiplier: 1, weight: 50 },
                { rarity: "Exquisite", multiplier: 2, weight: 25 },
                { rarity: "Precious", multiplier: 3, weight: 15 },
                { rarity: "Luxurious", multiplier: 4, weight: 8 },
                { rarity: "Remarkable", multiplier: 5, weight: 2 },
            ];

            function selectChestRarity() {
                const totalWeight = rarities.reduce(
                    (acc, rarity) => acc + rarity.weight,
                    0,
                );
                let randomWeight = Math.random() * totalWeight;

                for (const rarity of rarities) {
                    if (randomWeight < rarity.weight) {
                        return rarity;
                    }
                    randomWeight -= rarity.weight;
                }
                return rarities[0];
            }

            const selectedChest = selectChestRarity();
            const coinsFound =
                getRandomValue(10, 25) * selectedChest.multiplier;

            await addBalance(
                i.user.id,
                coinsFound,
                false,
                `Found a ${selectedChest.rarity} Treasure Chest`,
            );
            await r.edit(
                embedComment(
                    `You stumbled upon a ${selectedChest.rarity} Treasure Chest!\n It gave you ${customEmoji.a.z_coins} \`${coinsFound} Coins\`!`,
                    "Green",
                ),
            );
            await cooldowns.set(userWallet, "hunt", get.hrs(1));

            locked.del(i.user.id);
            return;
        }

        const monster = getRandomMonster(stats.worldLevel);
        const selectedDescription = getLiyueEncounterDescription(monster.name);
        let currentPlayerHp = stats.hp;
        let currentMonsterHp = Math.floor(
            getRandomValue(monster.minHp, monster.maxHp) *
                Math.pow(1.3, stats.worldLevel - 1),
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
                    const expGained = calculateExp(
                        monster.minExp,
                        monster.maxExp,
                    );
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
                        )
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
                    `>>> \`⚔️\` You dealt ${stats.attackPower} damage to the ${monster.name}!\n${monster.name}'s HP is now ${currentMonsterHp}/${initialMonsterHp}.`,
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
                    value: createHealthBar(currentMonsterHp, initialMonsterHp),
                    inline: true,
                },
            );

            await r.edit({ embeds: [battleEmbed] }).catch(() => null);
        }, get.secs(4)); // Don't put this below 4-5s otherwise it will cause the bot to get ratelimited 💀
    },
});
