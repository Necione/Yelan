import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    SlashCommandBuilder,
} from "discord.js";
import { getUserStats, updateUserStats } from "../../services";

export const downgrade = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("downgrade")
        .setDescription("[RPG] Downgrade your world level by up to 3 levels.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const stats = await getUserStats(i.user.id);

        if (!stats) {
            const embed = embedComment(
                `No stats found for you, please set up your profile.`,
            );
            return r.edit({
                embeds: embed.embeds,
                components: embed.components,
            });
        }

        if (stats.worldLevel <= 1) {
            const embed = embedComment(
                `You are already at the lowest world level (1)! You cannot downgrade further.`,
            );
            return r.edit({
                embeds: embed.embeds,
                components: embed.components,
            });
        }

        if (stats.worldLevel > stats.highestWL) {
            await updateUserStats(i.user.id, {
                highestWL: stats.worldLevel,
            });
        }

        const highestAllowedDowngrade = Math.max(stats.highestWL - 3, 1);
        const minDowngradeLevel = Math.max(1, stats.worldLevel - 3);
        const allowedDowngradeLevels = Math.max(
            minDowngradeLevel,
            highestAllowedDowngrade,
        );

        if (allowedDowngradeLevels >= stats.worldLevel) {
            const embed = embedComment(
                `You cannot downgrade lower than the limit of 3 levels below your highest world level (${stats.highestWL}).`,
            );
            return r.edit({
                embeds: embed.embeds,
                components: embed.components,
            });
        }

        const downgradeLevels = [];
        for (
            let level = stats.worldLevel - 1;
            level >= allowedDowngradeLevels;
            level--
        ) {
            downgradeLevels.push(level);
        }

        const buttons = downgradeLevels.map((level) =>
            new ButtonBuilder()
                .setCustomId(`downgrade_${level}`)
                .setLabel(`Downgrade to WL${level}`)
                .setStyle(ButtonStyle.Primary),
        );

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...buttons,
        );

        const confirmationEmbed = embedComment(
            `Select the world level you want to downgrade to.\nYour current world level is ${stats.worldLevel}.\nThis will reduce enemy difficulty and rewards, and your EXP will be reset.`,
            "Yellow",
        );

        await r.edit({
            embeds: confirmationEmbed.embeds,
            components: [actionRow],
        });

        const confirmation = await i.channel
            .awaitMessageComponent({
                time: 30000,
                componentType: ComponentType.Button,
                filter: (interaction) => interaction.user.id === i.user.id,
            })
            .catch(() => null);

        if (!confirmation) {
            const timeoutEmbed = embedComment(
                "Downgrade request timed out.",
                "Red",
            );
            return r.edit({
                embeds: timeoutEmbed.embeds,
                components: [],
            });
        }

        const selectedLevel = parseInt(confirmation.customId.split("_")[1], 10);

        await updateUserStats(i.user.id, {
            worldLevel: selectedLevel,
            exp: 0,
        });

        const successEmbed = embedComment(
            `Your world level has been downgraded to ${selectedLevel} and your EXP has been reset to 0.`,
            "Green",
        );

        return r.edit({
            embeds: successEmbed.embeds,
            components: [],
        });
    },
});
