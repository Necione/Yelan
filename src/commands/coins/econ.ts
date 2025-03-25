import type { SlashCommand } from "@elara-services/botbuilder";
import { formatNumber, make, noop } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { channels, economy, mainServerId, roles } from "../../config";
import { prisma } from "../../prisma";

export const econ: SlashCommand = {
    disabled: {
        channels: [
            channels.general,
            channels.genshin,
            channels.starrail,
            channels.booster,
        ],
    },
    command: new SlashCommandBuilder()
        .setName(`econ`)
        .setDescription(`Take a look at the current economy status.`)
        .setDMPermission(false),
    defer: {
        silent: false,
    },
    execute: async (interaction, responder) => {
        if (!interaction.guild) {
            return;
        }
        const guild =
            interaction.client.guilds.resolve(mainServerId) ||
            (await interaction.client.guilds.fetch(mainServerId).catch(noop));
        let hasRole = make.array<string>();
        if (guild) {
            const members = await guild.members.fetch().catch(noop);
            hasRole =
                members
                    ?.filter((c) => c.roles.cache.hasAll(...roles.main))
                    .map((c) => c.id) ?? [];
        }

        const files = (
            await prisma.userWallet
                .findMany({
                    where: {
                        userId: {
                            notIn: hasRole,
                        },
                    },
                })
                .catch(() => [])
        ).filter((c) => c.balance + c.vault >= 1);

        const TC = files.reduce(
            (acc, curr) => acc + (curr.balance + (curr.vault || 0)),
            0,
        );
        const T10C = files
            .sort(
                (a, b) =>
                    b.balance + (b.vault || 0) - (a.balance + (a.vault || 0)),
            )
            .slice(0, 10)
            .reduce(
                (acc: number, curr) => acc + (curr.balance + (curr.vault || 0)),
                0,
            );
        const embed = new EmbedBuilder()
            .setColor(0xc0f6fb)
            .setTitle("The Server Economy")
            .setDescription(
                `${customEmoji.a.z_coins} | Current ${
                    texts.c.u
                } in circulation: \`${formatNumber(TC)} ${texts.c.u}\`\n` +
                    `${customEmoji.a.z_info} | Top 10 holds \`${(
                        (T10C / TC) *
                        100
                    ).toFixed(2)}%\` of total ${texts.c.u}\n` +
                    `${customEmoji.a.z_repute} | You currently earn \`${economy.mora.min} - ${economy.mora.max} ${texts.c.u} Per Minute\``,
            );

        await responder.edit({ embeds: [embed] });
    },
};
