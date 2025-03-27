import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import {
    addButtonRow,
    awaitComponent,
    embedComment,
    get,
    getKeys,
    is,
    noop,
    sleep,
    time,
} from "@elara-services/utils";
import { cdn, texts } from "@liyueharbor/econ";
import type { Prisma } from "@prisma/client";
import { ButtonStyle, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    updateUserProfile,
    updateUserStats,
} from "../../services";
import { getDomainMonstersForDomain } from "../../services/domainService";
import { addItemToInventory } from "../../services/rpgSync/userStats";
import { getAmount, getPaginatedMessage } from "../../utils";
import { domains } from "../../utils/domainsHelper";
import { handleHunt } from "./handlers/huntHandler";

interface DomainReward {
    item: string;
    amount: number;
    chance: number;
}

interface DomainMonsters {
    monsters: string[];
    rewards: DomainReward[];
}

function parseDomainMonsters(data: {
    monsters: string[];
    rewards: Prisma.JsonValue;
}): DomainMonsters {
    const rewards = data.rewards as unknown as DomainReward[];
    return {
        monsters: data.monsters,
        rewards: rewards.map((reward) => ({
            item: reward.item,
            amount: reward.amount,
            chance: reward.chance,
        })),
    };
}

export const domain = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("domain")
        .setDescription("[RPG] Prove your worthiness by defeating a domain.")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("The name of the domain to challenge")
                .setRequired(false)
                .addChoices(
                    ...getKeys(domains).map((name) => ({
                        name,
                        value: name,
                    })),
                ),
        ),
    defer: { silent: false },
    only: { text: true, threads: false, voice: false, dms: false },

    async execute(interaction, r) {
        if (!interaction.channel || !("send" in interaction.channel)) {
            return r.edit(
                embedComment(
                    "Failed to start domain challenge - invalid channel.",
                ),
            );
        }
        const message = await interaction.fetchReply().catch(noop);
        if (!message) {
            return;
        }

        const now = new Date();
        const pst = new Date(
            now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
        );
        const today = pst.toISOString().split("T")[0];

        const domainName = interaction.options.getString("name", false);

        if (!domainName) {
            const pager = getPaginatedMessage();
            const stats = await getUserStats(interaction.user.id);
            const completedDomains = stats?.completedDomains || [];

            // Get today's monsters for all domains
            const domainMonstersMap = new Map<string, DomainMonsters>();
            for (const [name] of Object.entries(domains)) {
                const monsters = await getDomainMonstersForDomain(name, today);
                domainMonstersMap.set(name, parseDomainMonsters(monsters));
            }

            for (const [name, domain] of Object.entries(domains)) {
                const domainStatus = completedDomains.find((entry: string) =>
                    entry.startsWith(`${name}:${today}`),
                );
                const statusEmoji = domainStatus
                    ? domainStatus.endsWith(":win")
                        ? "✅"
                        : "❌"
                    : "";

                const embed = new EmbedBuilder()
                    .setColor(0xeee1a6)
                    .setThumbnail(cdn("/rpg/domain.png"))
                    .setTitle(`${name} ${statusEmoji}`)
                    .setDescription(domain.description)
                    .addFields(
                        {
                            name: "Domain Info",
                            value: `🌱 Required Rebirths: \`${
                                domain.requiredRebirths
                            }\`\n❌ Disabled Skills: \`${domain.disabledSkills.join(
                                ", ",
                            )}\``,
                        },
                        {
                            name: "Daily Monsters",
                            value: (domainMonstersMap.get(name)?.monsters || [])
                                .map((monster) => {
                                    if (monster.includes("|")) {
                                        const [base, mutation] =
                                            monster.split("|");
                                        return `- ${mutation} ${base}`;
                                    }
                                    return `- ${monster}`;
                                })
                                .join("\n"),
                        },
                        {
                            name: "Rewards",
                            value: `${getAmount(domain.reward.coins)}\n${(
                                domainMonstersMap.get(name)?.rewards || []
                            )
                                .sort((a, b) => b.chance - a.chance)
                                .map(
                                    (item) =>
                                        `\`${item.amount}x\` ${item.item} (${item.chance}%)`,
                                )
                                .join("\n")}`,
                        },
                    );

                pager.pages.push({ embeds: [embed] });
            }

            return pager.run(interaction, interaction.user).catch(noop);
        }

        const domain = domains[domainName];
        if (!domain) {
            return r.edit(embedComment(`Invalid domain name.`));
        }

        const stats = await getUserStats(interaction.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    "No stats found for you. Please set up your profile.",
                ),
            );
        }

        if (stats.isHunting) {
            return r.edit(
                embedComment(
                    "You cannot challenge a domain while you are already in a hunt or domain challenge!",
                ),
            );
        }

        if (stats.rebirths < domain.requiredRebirths) {
            return r.edit(
                embedComment(
                    `You need at least ${domain.requiredRebirths} rebirths to challenge ${domainName}.`,
                ),
            );
        }

        const completedDomains = stats.completedDomains || [];
        if (
            completedDomains.some((entry: string) =>
                entry.startsWith(`${domainName}:${today}`),
            )
        ) {
            const nextReset = new Date(pst);
            nextReset.setDate(nextReset.getDate() + 1);
            nextReset.setHours(0, 0, 0, 0);

            return r.edit(
                embedComment(
                    `You have already challenged ${domainName} today.\nDomains reset ${time.relative(
                        nextReset,
                    )}`,
                ),
            );
        }

        // Set isHunting to true before starting the domain challenge
        await updateUserStats(stats.userId, { isHunting: { set: true } });

        const warningEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle("⚠️ Domain Challenge Warning")
            .setDescription(
                `**YOU CAN ONLY CHALLENGE THIS DOMAIN ONCE PER DAY**\n\nAre you sure you want to proceed with challenging ${domainName}?`,
            )
            .setThumbnail(cdn("/rpg/domain.png"));

        const confirmButtons = addButtonRow([
            {
                id: "confirm_domain",
                label: "Yes, I'm Ready",
                style: ButtonStyle.Success,
            },
            {
                id: "cancel_domain",
                label: "Cancel",
                style: ButtonStyle.Danger,
            },
        ]);

        await r.edit({
            embeds: [warningEmbed],
            components: [confirmButtons],
        });

        const confirmation = await awaitComponent(message, {
            only: { originalUser: true },
            time: get.secs(30),
            custom_ids: [{ id: "confirm_domain" }, { id: "cancel_domain" }],
        });

        if (!confirmation || confirmation.customId === "cancel_domain") {
            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("Domain challenge cancelled."),
                ],
                components: [],
            });
        }

        await r.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xeee1a6)
                    .setDescription("May the archons be with you..."),
            ],
            components: [],
        });
        await sleep(get.secs(5));

        await r.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xeee1a6)
                    .setDescription(
                        `Challenging ${domainName}...\n\n${domain.description}`,
                    )
                    .setThumbnail(cdn("/rpg/domain.png")),
            ],
        });

        const originalActiveSkills = [...stats.activeSkills];

        const activeSkillsForDomain = originalActiveSkills.filter(
            (skill) => !domain.disabledSkills.includes(skill),
        );

        await updateUserStats(stats.userId, {
            activeSkills: { set: activeSkillsForDomain },
        });

        const userWallet = await getProfileByUserId(interaction.user.id);
        if (!userWallet) {
            return r.edit(
                embedComment("Unable to find/create your user profile."),
            );
        }

        // Get today's monsters for this domain
        const domainMonsters = parseDomainMonsters(
            await getDomainMonstersForDomain(domainName, today),
        );

        await handleHunt(
            message,
            { ...stats, activeSkills: activeSkillsForDomain },
            userWallet,
            domainMonsters.monsters,
            {
                win: async () => {
                    const obtainedItems = domainMonsters.rewards.filter(
                        (item: DomainReward) =>
                            Math.random() * 100 <= item.chance,
                    );

                    const embed = new EmbedBuilder()
                        .setColor(0xeee1a6)
                        .setTitle("Domain Victory!")
                        .setDescription(
                            `You have proven worthy of the ${domainName} domain!`,
                        )
                        .setThumbnail(cdn("/rpg/domain.png"))
                        .addFields({
                            name: `${texts.c.u} Earned`,
                            value: `${getAmount(domain.reward.coins)}`,
                            inline: true,
                        });

                    if (obtainedItems.length > 0) {
                        embed.addFields({
                            name: "Domain Rewards",
                            value: obtainedItems
                                .map(
                                    (item: DomainReward) =>
                                        `\`${item.amount}x\` ${item.item}`,
                                )
                                .join("\n"),
                            inline: true,
                        });
                    }

                    await r.edit({ embeds: [embed], components: [] });

                    if (is.array(obtainedItems)) {
                        await addItemToInventory(
                            interaction.user.id,
                            obtainedItems.map((item: DomainReward) => ({
                                item: item.item,
                                amount: item.amount,
                            })),
                        );
                    }

                    completedDomains.push(`${domainName}:${today}:win`);
                    await updateUserStats(stats.userId, {
                        completedDomains: { set: completedDomains },
                        isHunting: { set: false },
                        activeSkills: { set: originalActiveSkills },
                    });

                    await updateUserProfile(interaction.user.id, {
                        balance: {
                            increment: domain.reward.coins,
                        },
                    });

                    return "win";
                },
                lose: async () => {
                    const embed = new EmbedBuilder()
                        .setColor(0xeee1a6)
                        .setTitle("Domain Defeat")
                        .setDescription(
                            `The ${domainName} domain has found you unworthy. The domain's power overwhelms you, and you are forced to retreat.`,
                        )
                        .setThumbnail(cdn(`/rpg/domain.png`));

                    await r.edit({ embeds: [embed], components: [] });
                    await updateUserStats(stats.userId, {
                        completedDomains: {
                            set: [
                                ...completedDomains,
                                `${domainName}:${today}:lose`,
                            ],
                        },
                        isHunting: { set: false },
                        activeSkills: { set: originalActiveSkills },
                    });
                    return "lose";
                },
            },
            true,
        );
    },
});
