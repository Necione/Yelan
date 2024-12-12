import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
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
import { getAmount } from "../../utils";

export const downgrade = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("downgrade")
        .setDescription(
            "[RPG] Downgrade your Adventure Rank by up to 2 levels.",
        )
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

        if (stats.adventureRank <= 1) {
            return r.edit(
                embedComment(
                    `You are already at the lowest Adventure Rank (1)! You cannot downgrade further.`,
                ),
            );
        }

        if (stats.adventureRank > stats.highestWL) {
            await updateUserStats(i.user.id, {
                highestWL: stats.adventureRank,
            });
            stats.highestWL = stats.adventureRank;
        }

        if (userProfile.balance < 250) {
            return r.edit(
                embedComment(
                    `You need **${getAmount(
                        250,
                    )}** to downgrade your Adventure Rank.`,
                    "Red",
                ),
            );
        }

        const minDowngradeLevel = Math.max(stats.highestWL - 2, 1);

        if (stats.adventureRank <= minDowngradeLevel) {
            return r.edit(
                embedComment(
                    `You cannot downgrade lower than 2 levels below your highest Adventure Rank (${stats.highestWL}).`,
                    "Red",
                ),
            );
        }

        const downgradeLevels = [];
        for (
            let level = stats.adventureRank - 1;
            level >= minDowngradeLevel;
            level--
        ) {
            downgradeLevels.push(level);
        }

        const buttons = downgradeLevels.map((level) =>
            new ButtonBuilder()
                .setCustomId(`downgrade_${level}`)
                .setLabel(`Downgrade to AR${level}`)
                .setStyle(ButtonStyle.Primary),
        );

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...buttons,
        );

        await r.edit({
            ...embedComment(
                `Select the Adventure Rank you want to downgrade to. Downgrading costs **${getAmount(
                    250,
                )}**.\nYour current Adventure Rank is ${
                    stats.adventureRank
                }.\nThis will reduce enemy difficulty and rewards, and your EXP will be reset.`,
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
            `Paid 250 ${texts.c.u} to downgrade Adventure Rank from ${stats.adventureRank} to ${selectedLevel}`,
        );

        await updateUserStats(i.user.id, {
            adventureRank: { set: selectedLevel },
            exp: { set: 0 },
        });

        return r.edit(
            embedComment(
                `Your Adventure Rank has been downgraded to ${selectedLevel}, your EXP has been reset to 0, and **${getAmount(
                    250,
                )}** have been deducted from your wallet.`,
                "Green",
            ),
        );
    },
});
