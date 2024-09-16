import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    updateUserStats,
} from "../../services";
import { locked } from "../../utils";

const alchemyRankEmojis = {
    Bronze: "🟫",
    Silver: "⬜",
    Gold: "🟨",
    Platinum: "🟦",
    Sapphire: "🔷",
    Diamond: "🔶",
    Emerald: "🟩",
    Ruby: "🟥",
};

const alchemyRanks = [
    { name: "Bronze", min: 0, max: 10 },
    { name: "Silver", min: 10, max: 30 },
    { name: "Gold", min: 30, max: 60 },
    { name: "Platinum", min: 60, max: 100 },
    { name: "Sapphire", min: 100, max: 150 },
    { name: "Diamond", min: 150, max: 210 },
    { name: "Emerald", min: 210, max: 280 },
    { name: "Ruby", min: 280, max: 360 },
];

function getAlchemyRank(progress: number): { name: string; rankIndex: number } {
    for (let i = alchemyRanks.length - 1; i >= 0; i--) {
        if (progress >= alchemyRanks[i].min) {
            return { name: alchemyRanks[i].name, rankIndex: i };
        }
    }
    return { name: "Bronze", rankIndex: 0 };
}

function getAlchemyRankWithEmoji(progress: number): string {
    const { name: rankName } = getAlchemyRank(progress);

    if (rankName in alchemyRankEmojis) {
        const emoji =
            alchemyRankEmojis[rankName as keyof typeof alchemyRankEmojis];
        return `${emoji} ${rankName}`;
    }

    return `⬜ ${rankName}`;
}

const createAlchemyBar = (
    current: number,
    max: number,
    length: number = 20,
): string => {
    const { name: rankName, rankIndex } = getAlchemyRank(current);
    const rankMin = alchemyRanks[rankIndex].min;
    const rankMax = alchemyRanks[rankIndex].max;

    const relativeCurrent = Math.max(
        0,
        Math.min(current - rankMin, rankMax - rankMin),
    );
    const relativeMax = rankMax - rankMin;

    const filledLength = Math.round((relativeCurrent / relativeMax) * length);
    const emptyLength = Math.max(length - filledLength, 0);

    const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);

    return `\`${bar}\` ${relativeCurrent.toFixed(2)}/${relativeMax.toFixed(
        2,
    )} Alchemy (${rankName})`;
};

export const alchemy = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("alchemy")
        .setDescription("[RPG] Not sure what this does exactly")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The item that you want to use")
                .setRequired(false)
                .addChoices({ name: "Life Essence", value: "Life Essence" }),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The amount to use")
                .setRequired(false),
        ),
    defer: { silent: false },

    async execute(i, r) {
        const itemName = i.options.getString("item", false);
        const amountToUse = i.options.getInteger("amount", false) ?? 1;

        const userWallet = await getProfileByUserId(i.user.id);
        if (!userWallet) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to find/create your user profile."),
            );
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        if (stats.isHunting) {
            return r.edit(
                embedComment("You cannot perform alchemy while hunting!"),
            );
        }

        if (!itemName || !amountToUse) {
            const alchemyProgress = stats.alchemyProgress;
            const alchemyMax = 360;
            const alchemyBar = createAlchemyBar(alchemyProgress, alchemyMax);
            const alchemyRankWithEmoji =
                getAlchemyRankWithEmoji(alchemyProgress);
            const alchemyAttackIncrease = alchemyProgress * 0.5;

            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Your Alchemy Progress")
                        .setDescription(
                            `Alchemy Rank: ${alchemyRankWithEmoji}\n` +
                                `🍃 Essence: ${alchemyBar}\n\n` +
                                `Base ATK Bonus: \`+${alchemyAttackIncrease} ATK\``,
                        )
                        .setColor(0x4b52bb),
                ],
            });
        }

        const item = stats.inventory.find((c) => c.item === itemName);
        if (!item) {
            return r.edit(
                embedComment(
                    `You don't have "Life Essence" in your inventory.`,
                ),
            );
        }

        if (item.amount < amountToUse) {
            return r.edit(
                embedComment(`You don't have enough "Life Essence" to use.`),
            );
        }

        const alchemyIncrease = amountToUse;
        const newAlchemyProgress = stats.alchemyProgress + alchemyIncrease;

        item.amount -= amountToUse;
        if (item.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (c) => c.item !== item.item,
            );
        }

        const alchemyAttackIncrease = newAlchemyProgress * 0.5;

        await Promise.all([
            updateUserStats(i.user.id, {
                inventory: { set: stats.inventory },
                alchemyProgress: newAlchemyProgress,
                baseAttack: { set: alchemyAttackIncrease },
            }),
        ]);

        return r.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Alchemy Progress")
                    .setDescription(
                        `You used \`${amountToUse}x\` **Life Essence**.`,
                    )
                    .setColor("Green"),
            ],
        });
    },
});
