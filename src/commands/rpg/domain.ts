import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    getUserStats,
    updateUserProfile,
    updateUserStats,
} from "../../services";
import { addItemToInventory } from "../../services/rpgSync/userStats";
import { getPaginatedMessage } from "../../utils";
import { domains } from "../../utils/domainsHelper";
import { startHunt } from "./handlers/huntHandler";

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
                    ...Object.keys(domains).map((name) => ({
                        name,
                        value: name,
                    })),
                ),
        ),

    async execute(interaction, r) {
        await interaction.deferReply();

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
                    .setThumbnail("https://lh.elara.workers.dev/rpg/domain.png")
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
                            inline: false,
                        },
                        {
                            name: "Daily Monsters",
                            value: domain.monsters
                                .map((monster) => {
                                    if (monster.includes("|")) {
                                        const [base, mutation] =
                                            monster.split("|");
                                        return `- ${mutation} ${base}`;
                                    }
                                    return `- ${monster}`;
                                })
                                .join("\n"),
                            inline: false,
                        },
                        {
                            name: "Rewards",
                            value: `${customEmoji.a.z_coins} \`${domain.reward.coins.toLocaleString()}\` ${texts.c.u}\n${domain.reward.items
                                .map(
                                    (item) =>
                                        `\`${item.amount}x\` ${item.item} (${item.chance}%)`,
                                )
                                .join("\n")}`,
                            inline: false,
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

        if (stats.rebirths < domain.requiredRebirths) {
            return r.edit(
                embedComment(
                    `You need at least ${domain.requiredRebirths} rebirths to challenge ${domainName}.`,
                ),
            );
        }

        if (!interaction.channel || !("send" in interaction.channel)) {
            return r.edit(
                embedComment(
                    "Failed to start domain challenge - invalid channel.",
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
                    `You have already challenged ${domainName} today. Domain resets <t:${Math.floor(
                        nextReset.getTime() / 1000,
                    )}:R>`,
                ),
            );
        }

        await r.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xeee1a6)
                    .setDescription(
                        `Challenging ${domainName}...\n\n${domain.description}`,
                    )
                    .setThumbnail(
                        "https://lh.elara.workers.dev/rpg/domain.png",
                    ),
            ],
        });

        if (!interaction.replied) {
            return r.edit(embedComment("Failed to start domain challenge."));
        }

        const originalActiveSkills = [...stats.activeSkills];

        const activeSkillsForDomain = originalActiveSkills.filter(
            (skill) => !domain.disabledSkills.includes(skill),
        );

        await updateUserStats(stats.userId, {
            activeSkills: { set: activeSkillsForDomain },
        });

        await startHunt(
            await interaction.fetchReply(),
            interaction.user,
            domain.monsters,
            {
                win: async () => {
                    const obtainedItems = domain.reward.items.filter(
                        (item) => Math.random() * 100 <= item.chance,
                    );

                    const embed = new EmbedBuilder()
                        .setColor(0xeee1a6)
                        .setTitle("Domain Victory!")
                        .setDescription(
                            `You have proven worthy of the ${domainName} domain!`,
                        )
                        .setThumbnail(
                            "https://lh.elara.workers.dev/rpg/domain.png",
                        )
                        .addFields({
                            name: `${texts.c.u} Earned`,
                            value: `\`${domain.reward.coins.toLocaleString()}\` ${texts.c.u}`,
                            inline: true,
                        });

                    if (obtainedItems.length > 0) {
                        embed.addFields({
                            name: "Domain Rewards",
                            value: obtainedItems
                                .map(
                                    (item) =>
                                        `\`${item.amount}x\` ${item.item}`,
                                )
                                .join("\n"),
                            inline: true,
                        });
                    }

                    await r.edit({ embeds: [embed], components: [] });

                    if (obtainedItems.length > 0) {
                        await addItemToInventory(
                            interaction.user.id,
                            obtainedItems.map((item) => ({
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
                        .setThumbnail(
                            "https://lh.elara.workers.dev/rpg/domain.png",
                        );

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
