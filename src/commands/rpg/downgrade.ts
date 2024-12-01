import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    SlashCommandBuilder,
} from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    removeBalance,
    updateUserStats,
} from "../../services";

export const downgrade = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("downgrade")
        .setDescription("[RPG] Downgrade your world level by up to 2 levels.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        const userProfile = await getProfileByUserId(i.user.id);

        if (!userProfile) {
            return r.edit(
                embedComment(
                    "No profile found for your user. Please set up your profile.",
                ),
            );
        }

        if (stats.worldLevel <= 1) {
            return r.edit(
                embedComment(
                    `You are already at the lowest world level (1)! You cannot downgrade further.`,
                ),
            );
        }

        if (stats.worldLevel > stats.highestWL) {
            await updateUserStats(i.user.id, {
                highestWL: stats.worldLevel,
            });
            stats.highestWL = stats.worldLevel;
        }

        if (userProfile.balance < 250) {
            return r.edit(
                embedComment(
                    `You need **${customEmoji.a.z_coins} 250 ${texts.c.u}** to downgrade your world level.`,
                    "Red",
                ),
            );
        }

        const minDowngradeLevel = Math.max(stats.highestWL - 2, 1);

        if (stats.worldLevel <= minDowngradeLevel) {
            return r.edit(
                embedComment(
                    `You cannot downgrade lower than 2 levels below your highest world level (${stats.highestWL}).`,
                    "Red",
                ),
            );
        }

        const downgradeLevels = [];
        for (
            let level = stats.worldLevel - 1;
            level >= minDowngradeLevel;
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

        await r.edit({
            ...embedComment(
                `Select the world level you want to downgrade to. Downgrading costs **${customEmoji.a.z_coins} 250 ${texts.c.u}**.\nYour current world level is ${stats.worldLevel}.\nThis will reduce enemy difficulty and rewards, and your EXP will be reset.`,
                "Yellow",
            ),
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
            return r.edit(embedComment("Downgrade request timed out.", "Red"));
        }

        const selectedLevel = parseInt(confirmation.customId.split("_")[1], 10);

        await removeBalance(
            i.user.id,
            250,
            true,
            `Paid 250 ${texts.c.u} to downgrade world level from ${stats.worldLevel} to ${selectedLevel}`,
        );

        await updateUserStats(i.user.id, {
            worldLevel: selectedLevel,
            exp: 0,
        });

        return r.edit(
            embedComment(
                `Your world level has been downgraded to ${selectedLevel}, your EXP has been reset to 0, and **${customEmoji.a.z_coins} 250 ${texts.c.u}** have been deducted from your wallet.`,
                "Green",
            ),
        );
    },
});
