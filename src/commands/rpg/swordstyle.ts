import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { syncStats, updateUserStats } from "../../services";
import { debug, getPaginatedMessage } from "../../utils";
import { calculateMasteryLevel } from "../../utils/helpers/masteryHelper";
import {
    calculateSwordStyleRank,
    getStylePoints,
    getUnlockedTraits,
    isValidSwordStyle,
    swordStyles,
    type SwordStyleName,
} from "../../utils/helpers/swordStyleHelper";

export const swordstyle = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("swordstyle")
        .setDescription("[RPG] View or select your sword style.")
        .addStringOption((option) =>
            option
                .setName("style")
                .setDescription("The sword style to use")
                .setRequired(false)
                .addChoices(
                    { name: "Kamisato Art", value: "Kamisato Art" },
                    { name: "Guhua Style", value: "Guhua Style" },
                    { name: "Favonius Bladework", value: "Favonius Bladework" },
                ),
        )
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        try {
            const userId = i.user.id;
            const selectedStyle = i.options.getString("style", false);

            const stats = await syncStats(userId);
            if (!stats) {
                return r.edit(
                    embedComment(
                        "No stats found for you, please set up your profile.",
                    ),
                );
            }

            const { numericLevel } = calculateMasteryLevel(
                stats.masterySword || 0,
            );
            if (numericLevel < 1) {
                return r.edit(
                    embedComment(
                        "You need to reach `Sword Mastery I` before you can use sword styles.",
                    ),
                );
            }

            if (selectedStyle) {
                if (!isValidSwordStyle(selectedStyle)) {
                    return r.edit(
                        embedComment("Invalid sword style selected."),
                    );
                }

                await updateUserStats(userId, {
                    swordStyle: { set: selectedStyle },
                });

                const points = getStylePoints(stats, selectedStyle);
                const rank = calculateSwordStyleRank(points);

                const embed = new EmbedBuilder()
                    .setColor(0x2b2d31)
                    .setTitle("Sword Style Changed")
                    .setDescription(
                        `You are now using **${selectedStyle}** (${rank}).\nYour proficiency will increase as you win battles using this style.`,
                    );

                return r.edit({ embeds: [embed] });
            }

            const styles: SwordStyleName[] = [
                "Kamisato Art",
                "Guhua Style",
                "Favonius Bladework",
            ];
            const pager = getPaginatedMessage();

            for (const style of styles) {
                const points = getStylePoints(stats, style);
                const rank = calculateSwordStyleRank(points);
                const styleInfo = swordStyles[style];
                const unlockedTraits = getUnlockedTraits(style, points);

                const embed = new EmbedBuilder()
                    .setColor("#dda77c")
                    .setThumbnail(
                        "https://lh.elara.workers.dev/rpg/swordstyle.png",
                    )
                    .setTitle(
                        `${style}${
                            stats.swordStyle === style
                                ? " (✅ Currently Active)"
                                : ""
                        } - ${rank}`,
                    )
                    .setDescription(
                        styleInfo.description +
                            `\n\n**Gain Condition:**\n${styleInfo.gainCondition}`,
                    )
                    .addFields(
                        {
                            name: "Progress",
                            value:
                                points >= 150
                                    ? "150/150"
                                    : `${points}/${points < 50 ? "50" : "150"}`,
                            inline: true,
                        },
                        {
                            name: "Special Traits",
                            value:
                                unlockedTraits
                                    .map(
                                        (trait) =>
                                            `- **${trait.name}** - ${trait.description}`,
                                    )
                                    .join("\n") +
                                (points < 150
                                    ? `\n\n*Next trait unlocks at ${
                                          points < 50
                                              ? "Apprentice (50 points)"
                                              : "Adept (150 points)"
                                      }*`
                                    : ""),
                        },
                    );

                pager.pages.push({ embeds: [embed] });
            }

            return pager.run(i, i.user).catch(noop);
        } catch (error) {
            debug("Error in swordstyle command:", error);
            return r.edit(
                embedComment(
                    "An error occurred while processing your command.",
                ),
            );
        }
    },
});
