import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import {
    ActionRowBuilder,
    ComponentType,
    EmbedBuilder,
    type Message,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    type StringSelectMenuInteraction,
} from "discord.js";
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
    Ascended: "🔳",
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
    { name: "Ascended", min: 360, max: Infinity },
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

    const relativeCurrent =
        rankName === "Ascended"
            ? rankMax - rankMin
            : Math.max(0, Math.min(current - rankMin, rankMax - rankMin));
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
                .setRequired(false)
                .setMinValue(1),
        ),
    defer: { silent: false },

    async execute(i) {
        const action = i.options.getString("action", false);
        const stat = i.options.getString("stat", false);
        const pointsToAssign = i.options.getInteger("points", false);

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            await i.editReply(
                embedComment(
                    "No stats found for you, please set up your profile.",
                ),
            );
            return;
        }

        const alchemyProgress = stats.alchemyProgress;
        const alchemyMax = 360;
        const { name: rankName } = getAlchemyRank(alchemyProgress);
        const isAscended = rankName === "Ascended";

        if (isAscended && !stats.deity) {
            const deityOptions = [
                { label: "The End", value: "The End" },
                { label: "The Harvest", value: "The Harvest" },
                { label: "The Wisened", value: "The Wisened" },
                { label: "The Wanderer", value: "The Wanderer" },
                { label: "The Chaos", value: "The Chaos" },
                { label: "Go Alone", value: "None" },
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("deity_select")
                .setPlaceholder("Select a deity")
                .addOptions(
                    deityOptions.map((option) => ({
                        label: option.label,
                        value: option.value,
                    })),
                );

            const row =
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    selectMenu,
                );

            const message = (await i.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Choose Your Deity")
                        .setDescription(
                            "You have reached the **Ascended** rank. Please choose a deity to follow:\n**⚠️ You will __NEVER__ be able to change this decision.**\n*You may choose to ignore this and choose later*",
                        )
                        .setColor(0x4b52bb),
                ],
                components: [row],
            })) as Message;

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: (interaction: StringSelectMenuInteraction) =>
                    interaction.user.id === i.user.id &&
                    interaction.customId === "deity_select",
            });

            collector.on(
                "collect",
                async (interaction: StringSelectMenuInteraction) => {
                    const chosenDeity = interaction.values[0];

                    await updateUserStats(i.user.id, { deity: chosenDeity });

                    const disabledSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId("deity_select")
                        .setPlaceholder("Deity Selected")
                        .setDisabled(true)
                        .addOptions(
                            deityOptions.map((option) => ({
                                label: option.label,
                                value: option.value,
                            })),
                        );

                    const disabledRow =
                        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                            disabledSelectMenu,
                        );

                    await interaction.update({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Deity Chosen")
                                .setDescription(
                                    chosenDeity === "None"
                                        ? "You have chosen to **Go Alone**."
                                        : `You have chosen to follow **${chosenDeity}**.`,
                                )
                                .setColor(0x4b52bb),
                        ],
                        components: [disabledRow],
                    });
                },
            );

            collector.on("end", async (_collected, reason: string) => {
                if (reason === "time" && !stats.deity) {
                    await message.edit({
                        content: "You did not choose a deity in time.",
                        embeds: [],
                        components: [],
                    });
                }
            });

            return;
        }

        if (!action || !stat || !pointsToAssign) {
            const alchemyRankWithEmoji =
                getAlchemyRankWithEmoji(alchemyProgress);

            const assignedAtkBonus = stats.assignedAtk * 0.25;
            const assignedHpBonus = stats.assignedHp * 2;
            const assignedCritValueBonus = (
                stats.assignedCritValue * 0.01
            ).toFixed(2);
            const assignedDefValueBonus = (stats.assignedDefValue * 1).toFixed(
                2,
            );

            const deityInfo =
                isAscended && stats.deity
                    ? `\nDeity: **${
                          stats.deity === "None"
                              ? "None (Going Alone)"
                              : stats.deity
                      }**`
                    : "";

            const essenceDisplay = isAscended
                ? `🍃 Total Essence: \`${alchemyProgress}\``
                : `🍃 Essence: ${createAlchemyBar(
                      alchemyProgress,
                      alchemyMax,
                  )}`;

            await i.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Your Alchemy Profile")
                        .setDescription(
                            `Alchemist Rank: ${alchemyRankWithEmoji}${deityInfo}\n` +
                                `${essenceDisplay}`,
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
                            },
                            {
                                name: "Total Assigned Points",
                                value: `\`${stats.totalAssigned}/${alchemyProgress}\` Points`,
                            },
                        ),
                ],
            });
            return;
        }

        const totalAssigned = stats.totalAssigned ?? 0;

        if (action === "allocate") {
            if (totalAssigned + pointsToAssign > alchemyProgress) {
                await i.editReply(
                    embedComment(
                        `You cannot assign more points than your alchemy progress allows.`,
                    ),
                );
                return;
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
                    await i.editReply(embedComment("Invalid stat chosen."));
                    return;
            }

            newTotalAssigned += pointsToAssign;

            await updateUserStats(i.user.id, {
                assignedAtk: newAssignedAtk,
                assignedHp: newAssignedHp,
                assignedCritValue: newAssignedCritValue,
                assignedDefValue: newAssignedDefValue,
                totalAssigned: newTotalAssigned,
            });

            await i.editReply(
                embedComment(
                    `You have successfully assigned \`${pointsToAssign}\` points to ${stat}. \nYou have \`${
                        alchemyProgress - newTotalAssigned
                    }\` points remaining to assign.`,
                ),
            );
            return;
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
                        await i.editReply(
                            embedComment(
                                "You cannot deallocate more points than you have assigned to ATK.",
                            ),
                        );
                        return;
                    }
                    newAssignedAtk -= pointsToAssign;
                    break;
                case "HP":
                    if (newAssignedHp < pointsToAssign) {
                        await i.editReply(
                            embedComment(
                                "You cannot deallocate more points than you have assigned to HP.",
                            ),
                        );
                        return;
                    }
                    newAssignedHp -= pointsToAssign;
                    break;
                case "Crit Value":
                    if (newAssignedCritValue < pointsToAssign) {
                        await i.editReply(
                            embedComment(
                                "You cannot deallocate more points than you have assigned to Crit Value.",
                            ),
                        );
                        return;
                    }
                    newAssignedCritValue -= pointsToAssign;
                    break;
                case "DEF Value":
                    if (newAssignedDefValue < pointsToAssign) {
                        await i.editReply(
                            embedComment(
                                "You cannot deallocate more points than you have assigned to DEF Value.",
                            ),
                        );
                        return;
                    }
                    newAssignedDefValue -= pointsToAssign;
                    break;
                default:
                    await i.editReply(embedComment("Invalid stat chosen."));
                    return;
            }

            newTotalAssigned -= pointsToAssign;

            await updateUserStats(i.user.id, {
                assignedAtk: newAssignedAtk,
                assignedHp: newAssignedHp,
                assignedCritValue: newAssignedCritValue,
                assignedDefValue: newAssignedDefValue,
                totalAssigned: newTotalAssigned,
            });

            await i.editReply(
                embedComment(
                    `You have successfully deallocated \`${pointsToAssign}\` points from ${stat}. \nYou now have \`${
                        alchemyProgress - newTotalAssigned
                    }\` points remaining to assign.`,
                ),
            );
            return;
        }
    },
});
