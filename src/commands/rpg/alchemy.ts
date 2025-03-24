import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get } from "@elara-services/utils";
import {
    ActionRowBuilder,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
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
    length = 20,
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

    return `\`${bar}\` ${relativeCurrent.toFixed(2)}/${relativeMax.toFixed(2)}`;
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

        const alchemyProgress = stats.alchemyProgress;
        const alchemyMax = 360;
        const { name: rankName } = getAlchemyRank(alchemyProgress);
        const isAscended = rankName === "Ascended";

        if (isAscended && !stats.deity) {
            const deityOptions = [
                { label: "Venti", value: "Venti" },
                { label: "Zhongli", value: "Zhongli" },
                { label: "Furina", value: "Furina" },
                { label: "Tsaritsa", value: "Tsaritsa" },
                { label: "Raiden", value: "Raiden" },
                { label: "Nahida", value: "Nahida" },
                { label: "Mavuika", value: "Mavuika" },
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("deity_select")
                .setPlaceholder("Select an Archon")
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

            const message = await r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Choose Your Archon")
                        .setDescription(
                            "You have reached the **Ascended** rank. Please choose an Archon to follow:\n**⚠️ You will __NEVER__ be able to change this decision.**\n*You may choose to ignore this and choose later*",
                        )
                        .setColor(0x4b52bb),
                ],
                components: [row],
            });
            if (!message) {
                return r.edit(
                    embedComment(`Unable to fetch the original message`),
                );
            }

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: get.mins(1),
                filter: (interaction) =>
                    interaction.user.id === i.user.id &&
                    interaction.customId === "deity_select",
            });

            collector.on("collect", async (interaction) => {
                const chosenDeity = interaction.values[0];

                await updateUserStats(i.user.id, {
                    deity: { set: chosenDeity },
                });

                const disabledSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId("deity_select")
                    .setPlaceholder("Archon Selected")
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
                            .setTitle("Archon Chosen")
                            .setDescription(
                                `You have chosen to follow **${chosenDeity}**.`,
                            )
                            .setColor(0x4b52bb),
                    ],
                    components: [disabledRow],
                });
            });

            collector.on("end", async (_, reason: string) => {
                if (reason === "time" && !stats.deity) {
                    await r.edit(
                        embedComment("You did not choose an Archon in time."),
                    );
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
                    ? `\nArchon: **${
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

            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Your Alchemy Profile")
                        .setDescription(
                            `Alchemist Rank: ${alchemyRankWithEmoji}${deityInfo}\n` +
                                `${essenceDisplay}`,
                        )
                        .setColor(0xcae67d)
                        .setThumbnail(
                            `https://lh.elara.workers.dev/rpg/alchem.png`,
                        )
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
        }

        const totalAssigned = stats.totalAssigned ?? 0;

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
                assignedAtk: { set: newAssignedAtk },
                assignedHp: { set: newAssignedHp },
                assignedCritValue: { set: newAssignedCritValue },
                assignedDefValue: { set: newAssignedDefValue },
                totalAssigned: { set: newTotalAssigned },
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
                                "You cannot deallocate more points than you have assigned to Crit Value.",
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
                assignedAtk: { set: newAssignedAtk },
                assignedHp: { set: newAssignedHp },
                assignedCritValue: { set: newAssignedCritValue },
                assignedDefValue: { set: newAssignedDefValue },
                totalAssigned: { set: newTotalAssigned },
            });

            return r.edit(
                embedComment(
                    `You have successfully deallocated \`${pointsToAssign}\` points from ${stat}. \nYou now have \`${
                        alchemyProgress - newTotalAssigned
                    }\` points remaining to assign.`,
                ),
            );
        }
    },
});
