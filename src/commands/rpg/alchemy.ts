import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";

const alchemyRankEmojis = {
    Bronze: "🟫",
    Silver: "⬜",
    Gold: "🟨",
    Platinum: "🟦",
    Sapphire: "🔷",
    Diamond: "💠",
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
        .setDescription(
            "[RPG] View your alchemy profile or assign/deallocate points to stats.",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("action")
                .setDescription(
                    "Choose whether to allocate or deallocate points.",
                )
                .setRequired(false)
                .addChoices(
                    { name: "Allocate", value: "allocate" },
                    { name: "Deallocate", value: "deallocate" },
                ),
        )
        .addStringOption((option) =>
            option
                .setName("stat")
                .setDescription(
                    "The stat to assign or deallocate points to/from.",
                )
                .setRequired(false)
                .addChoices(
                    { name: "ATK", value: "ATK" },
                    { name: "HP", value: "HP" },
                    { name: "Crit Value", value: "Crit Value" },
                    { name: "DEF Value", value: "DEF Value" },
                ),
        )
        .addIntegerOption((option) =>
            option
                .setName("points")
                .setDescription(
                    "The number of points to allocate or deallocate.",
                )
                .setRequired(false),
        ),
    defer: { silent: false },

    async execute(i, r) {
        const action = i.options.getString("action", false);
        const stat = i.options.getString("stat", false);
        const pointsToAssign = i.options.getInteger("points", false);

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    "No stats found for you, please set up your profile.",
                ),
            );
        }

        if (!action || !stat || !pointsToAssign) {
            const alchemyProgress = stats.alchemyProgress;
            const alchemyMax = 360;
            const alchemyBar = createAlchemyBar(alchemyProgress, alchemyMax);
            const alchemyRankWithEmoji =
                getAlchemyRankWithEmoji(alchemyProgress);

            const assignedAtkBonus = stats.assignedAtk * 0.25;
            const assignedHpBonus = stats.assignedHp * 5;
            const assignedCritValueBonus = (
                stats.assignedCritValue * 0.01
            ).toFixed(2);
            const assignedDefValueBonus = (
                stats.assignedDefValue * 0.01
            ).toFixed(2);

            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Your Alchemy Profile")
                        .setDescription(
                            `Alchemist Rank: ${alchemyRankWithEmoji}\n` +
                                `🍃 Essence: ${alchemyBar}`,
                        )
                        .setColor(0x4b52bb)
                        .addFields(
                            {
                                name: "Assigned Bonuses",
                                value:
                                    `⚔️ ATK: \`+${assignedAtkBonus}\` (${stats.assignedAtk} Points)\n` +
                                    `❤️ HP: \`+${assignedHpBonus}\` (${stats.assignedHp} Points)\n` +
                                    `💥 Crit Value: \`+${assignedCritValueBonus}\` (${stats.assignedCritValue} Points)\n` +
                                    `🛡️ DEF Value: \`+${assignedDefValueBonus}\` (${stats.assignedDefValue} Points)`,
                                inline: false,
                            },
                            {
                                name: "Total Assigned Points",
                                value: `\`${stats.totalAssigned}/${alchemyProgress}\` Points`,
                                inline: false,
                            },
                        ),
                ],
            });
        }

        const totalAssigned = stats.totalAssigned ?? 0;
        const alchemyProgress = stats.alchemyProgress;

        if (action === "allocate") {
            if (totalAssigned + pointsToAssign > alchemyProgress) {
                return r.edit(
                    embedComment(
                        `You cannot assign more points than your alchemy progress allows.`,
                    ),
                );
            }

            let newAssignedAtk = stats.assignedAtk ?? 0;
            let newAssignedHp = stats.assignedHp ?? 0;
            let newAssignedCritValue = stats.assignedCritValue ?? 0;
            let newAssignedDefValue = stats.assignedDefValue ?? 0;
            let newTotalAssigned = totalAssigned;

            switch (stat) {
                case "ATK":
                    newAssignedAtk += pointsToAssign;
                    break;
                case "HP":
                    newAssignedHp += pointsToAssign;
                    break;
                case "Crit Value":
                    newAssignedCritValue += pointsToAssign;
                    break;
                case "DEF Value":
                    newAssignedDefValue += pointsToAssign;
                    break;
                default:
                    return r.edit(embedComment("Invalid stat chosen."));
            }

            newTotalAssigned += pointsToAssign;

            await updateUserStats(i.user.id, {
                assignedAtk: newAssignedAtk,
                assignedHp: newAssignedHp,
                assignedCritValue: newAssignedCritValue,
                assignedDefValue: newAssignedDefValue,
                totalAssigned: newTotalAssigned,
            });

            return r.edit(
                embedComment(
                    `You have successfully assigned \`${pointsToAssign}\` points to ${stat}. \nYou have \`${
                        alchemyProgress - newTotalAssigned
                    }\` points remaining to assign.`,
                ),
            );
        }

        if (action === "deallocate") {
            let newAssignedAtk = stats.assignedAtk ?? 0;
            let newAssignedHp = stats.assignedHp ?? 0;
            let newAssignedCritValue = stats.assignedCritValue ?? 0;
            let newAssignedDefValue = stats.assignedDefValue ?? 0;
            let newTotalAssigned = totalAssigned;

            switch (stat) {
                case "ATK":
                    if (newAssignedAtk < pointsToAssign) {
                        return r.edit(
                            embedComment(
                                "You cannot deallocate more points than you have assigned to ATK.",
                            ),
                        );
                    }
                    newAssignedAtk -= pointsToAssign;
                    break;
                case "HP":
                    if (newAssignedHp < pointsToAssign) {
                        return r.edit(
                            embedComment(
                                "You cannot deallocate more points than you have assigned to HP.",
                            ),
                        );
                    }
                    newAssignedHp -= pointsToAssign;
                    break;
                case "Crit Value":
                    if (newAssignedCritValue < pointsToAssign) {
                        return r.edit(
                            embedComment(
                                "You cannot deallocate more points than you have assigned to Crit DMG.",
                            ),
                        );
                    }
                    newAssignedCritValue -= pointsToAssign;
                    break;
                case "DEF Value":
                    if (newAssignedDefValue < pointsToAssign) {
                        return r.edit(
                            embedComment(
                                "You cannot deallocate more points than you have assigned to DEF Value.",
                            ),
                        );
                    }
                    newAssignedDefValue -= pointsToAssign;
                    break;
                default:
                    return r.edit(embedComment("Invalid stat chosen."));
            }

            newTotalAssigned -= pointsToAssign;

            await updateUserStats(i.user.id, {
                assignedAtk: newAssignedAtk,
                assignedHp: newAssignedHp,
                assignedCritValue: newAssignedCritValue,
                assignedDefValue: newAssignedDefValue,
                totalAssigned: newTotalAssigned,
            });

            return r.edit(
                embedComment(
                    `You have successfully deallocated \`${pointsToAssign}\` points from ${stat.toUpperCase()}. \nYou now have \`${
                        alchemyProgress - newTotalAssigned
                    }\` points remaining to assign.`,
                ),
            );
        }
    },
});
