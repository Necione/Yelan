import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, make } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { masteryBenefits } from "../../utils/masteryData";
import { calculateMasteryLevel, toRoman } from "../../utils/masteryHelper";
import { type WeaponType } from "../../utils/rpgitems/weapons";
import {
    type SpecialSkillName,
    specialSkills,
} from "../../utils/specialSkills";

type MasteryField =
    | "masterySword"
    | "masteryClaymore"
    | "masteryBow"
    | "masteryPolearm"
    | "masteryCatalyst"
    | "masteryRod";

const masteryFieldMap: Record<WeaponType, MasteryField> = {
    Sword: "masterySword",
    Claymore: "masteryClaymore",
    Bow: "masteryBow",
    Polearm: "masteryPolearm",
    Catalyst: "masteryCatalyst",
    Rod: "masteryRod",
};

export const masteriesCommand = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("masteries")
        .setDescription(
            "[RPG] Displays your mastery levels or benefits for a specific weapon type.",
        )
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("The weapon type to view mastery benefits for.")
                .setRequired(false)
                .addChoices(
                    { name: "Sword", value: "Sword" },
                    { name: "Claymore", value: "Claymore" },
                    { name: "Bow", value: "Bow" },
                    { name: "Polearm", value: "Polearm" },
                    { name: "Catalyst", value: "Catalyst" },
                    { name: "Rod", value: "Rod" },
                ),
        )
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        const type = i.options.getString("type") as WeaponType | null;

        if (type) {
            const benefits = masteryBenefits[type];
            if (!benefits) {
                return r.edit(embedComment(`Invalid weapon type "${type}".`));
            }

            const masteryPoints = stats[masteryFieldMap[type]];

            const masteryLevelObj = calculateMasteryLevel(masteryPoints);
            const { numericLevel } = masteryLevelObj;

            const unlockedSkills = make.array<SpecialSkillName>();
            for (let lvl = 1; lvl <= numericLevel; lvl++) {
                const benefit = benefits[lvl];
                if (
                    benefit?.specialSkill &&
                    !stats.unlockedSpecialSkills.includes(benefit.specialSkill)
                ) {
                    const isValidSkill = specialSkills.some(
                        (skill) => skill.skillName === benefit.specialSkill,
                    );
                    if (isValidSkill) {
                        unlockedSkills.push(
                            benefit.specialSkill as SpecialSkillName,
                        );
                    }
                }
            }

            if (is.array(unlockedSkills)) {
                await updateUserStats(i.user.id, {
                    unlockedSpecialSkills: {
                        push: unlockedSkills,
                    },
                });
            }

            const benefitsList = Object.entries(benefits)
                .map(([levelNum, benefit]) => {
                    const masteryLevel = `Mastery ${toRoman(Number(levelNum))}`;
                    const descriptionPart = benefit.description
                        ? `\n${benefit.description}`
                        : "";
                    const skillPart = benefit.specialSkill
                        ? `\n\`🔓\` Unlock the skill "${benefit.specialSkill}"`
                        : "";
                    return `**${masteryLevel}**${descriptionPart}${skillPart}`;
                })
                .join("\n\n");

            const embed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle(`${type} Mastery Benefits`)
                .setDescription(benefitsList);

            if (is.array(unlockedSkills)) {
                embed.addFields({
                    name: "Newly Unlocked Skills",
                    value: unlockedSkills
                        .map((skill) => `✅ ${skill}`)
                        .join("\n"),
                });
            }

            return r.edit({ embeds: [embed] });
        }

        const masteryData = [
            { name: "Sword", emoji: "🗡️", value: stats.masterySword },
            { name: "Claymore", emoji: "⚔️", value: stats.masteryClaymore },
            { name: "Bow", emoji: "🏹", value: stats.masteryBow },
            { name: "Polearm", emoji: "🔱", value: stats.masteryPolearm },
            { name: "Catalyst", emoji: "🔮", value: stats.masteryCatalyst },
            { name: "Rod", emoji: "🎣", value: stats.masteryRod },
        ];

        const masteryList = masteryData
            .map((mastery) => {
                const { level, remaining, nextLevel } = calculateMasteryLevel(
                    mastery.value,
                );
                return (
                    `\`${mastery.emoji}\` **${mastery.name}:** \`${level}\`` +
                    (nextLevel > 0 ? ` (${remaining}/${nextLevel})` : "")
                );
            })
            .join("\n");

        const embed = new EmbedBuilder()
            .setColor("Gold")
            .setTitle(`${i.user.username}'s Weapon Masteries`)
            .setThumbnail(i.user.displayAvatarURL())
            .setDescription(
                "Your mastery levels for each weapon are displayed below. Level up your masteries by using weapons in battle!",
            )
            .addFields({ name: "Mastery Levels", value: masteryList });

        await r.edit({ embeds: [embed] });
    },
});
