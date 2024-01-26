import { SlashCommand } from "@elara-services/botbuilder";
import { formatNumber } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { channels } from "../../config";
import { prisma } from "../../prisma";
import { customEmoji, texts } from "../../utils";

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
        const files = (
            await prisma.userWallet.findMany().catch(() => [])
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
                    `${customEmoji.a.z_repute} | You currently earn \`3 - 7 ${texts.c.u} Per Minute\``,
            );

        await responder.edit({ embeds: [embed] });
    },
};
