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
        .setDescription("[RPG] Downgrade your world level by 1.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
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
                `You are already at the lowest world level (1). You cannot downgrade further.`,
            );
            return r.edit({
                embeds: embed.embeds,
                components: embed.components,
            });
        }

        if (stats.highestWL < stats.worldLevel) {
            await updateUserStats(i.user.id, {
                highestWL: stats.worldLevel,
            });
        }

        if (stats.worldLevel - 1 < stats.highestWL) {
            const embed = embedComment(
                `You cannot downgrade below your highest world level (${stats.highestWL}).`,
            );
            return r.edit({
                embeds: embed.embeds,
                components: embed.components,
            });
        }

        const confirmButton = new ButtonBuilder()
            .setCustomId("confirm")
            .setLabel("Confirm")
            .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            confirmButton,
            cancelButton,
        );

        const confirmationEmbed = embedComment(
            `Are you sure you want to downgrade your world level from ${
                stats.worldLevel
            } to ${
                stats.worldLevel - 1
            }?\nThis will reduce enemy difficulty and rewards, and your EXP will be reset.`,
            "Yellow",
        );

        await r.edit({
            embeds: confirmationEmbed.embeds,
            components: [actionRow],
        });

        const confirmation = await i.channel?.awaitMessageComponent({
            time: 15000,
            componentType: ComponentType.Button,
            filter: (interaction) => interaction.user.id === i.user.id,
        });

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

        if (confirmation.customId === "confirm") {
            await updateUserStats(i.user.id, {
                worldLevel: stats.worldLevel - 1,
                exp: 0,
            });

            const successEmbed = embedComment(
                `Your world level has been downgraded to ${
                    stats.worldLevel - 1
                } and your EXP has been reset to 0.`,
                "Green",
            );
            return r.edit({
                embeds: successEmbed.embeds,
                components: [],
            });
        } else if (confirmation.customId === "cancel") {
            const cancelEmbed = embedComment(
                `Downgrade cancelled. Your world level remains at ${stats.worldLevel}.`,
                "Red",
            );
            return r.edit({
                embeds: cancelEmbed.embeds,
                components: [],
            });
        }
    },
});
