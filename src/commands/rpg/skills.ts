import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getUserStats } from "../../services";
import { getUserSkillLevelData, skills } from "../../utils/skillsData";
import { specialSkills } from "../../utils/specialSkills";

function getMaxActiveSkills(alchemyProgress: number): number {
    if (alchemyProgress >= 360) {
        return 7;
    } else if (alchemyProgress >= 100) {
        return 6;
    } else {
        return 5;
    }
}

const getSkillEmoji = (skillName: string): string => {
    const skill = skills.find((s) => s.name === skillName);
    return skill ? skill.emoji : "";
};

export const skillsCommand = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("skills")
        .setDescription(
            "[RPG] Displays your skills or details about a specific skill.",
        )
        .addStringOption((option) =>
            option
                .setName("skill")
                .setDescription("The skill you want to view")
                .setRequired(false)
                .setAutocomplete(true),
        )
        .setDMPermission(false),
    defer: { silent: false },
    async autocomplete(i) {
        const searchTerm = i.options.getFocused()?.toLowerCase() || "";

        const allOptions = [
            ...skills.map((skill) => ({
                name: `${skill.name}`,
                value: skill.name,
            })),
            ...specialSkills.map((special) => ({
                name: `${special.skillName}`,
                value: special.skillName,
            })),
        ];

        const filteredOptions = allOptions.filter((option) =>
            option.name.toLowerCase().includes(searchTerm),
        );

        return i.respond(filteredOptions.slice(0, 25)).catch(noop);
    },
    async execute(i, r) {
        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        const skillName = i.options.getString("skill");

        if (skillName) {
            const skill =
                skills.find((s) => s.name === skillName) ||
                specialSkills.find((s) => s.skillName === skillName);

            if (!skill) {
                return r.edit(
                    embedComment(`The skill "${skillName}" does not exist.`),
                );
            }

            if ("levels" in skill) {
                const userSkillLevelData = getUserSkillLevelData(
                    stats,
                    skillName,
                );

                const userSkillLevel = userSkillLevelData
                    ? userSkillLevelData.level
                    : 0;

                const embed = new EmbedBuilder()
                    .setColor("Aqua")
                    .setTitle(`\`${skill.emoji}\` ${skill.name} Skill Details`)
                    .setDescription(
                        skill.levels
                            .map((level) => {
                                const isCurrentLevel =
                                    level.level === userSkillLevel;
                                const levelHeader = isCurrentLevel
                                    ? `**Level ${level.level}:** (Current)`
                                    : `**Level ${level.level}:**`;
                                return `> ${levelHeader}\n${level.description}`;
                            })
                            .join("\n\n"),
                    )
                    .setFooter({
                        text: `Use /learn to learn or upgrade this skill.`,
                    });

                return r.edit({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor("Gold")
                    .setTitle(
                        `\`${skill.emoji}\` ${skill.skillName} Special Skill`,
                    )
                    .setDescription(skill.description)
                    .setFooter({
                        text: "Special skills are unlocked through mastery levels.",
                    });

                return r.edit({ embeds: [embed] });
            }
        }

        const learnedSkills = stats.skills || [];
        const activeSkills = stats.activeSkills || [];
        const unlockedSpecialSkills = stats.unlockedSpecialSkills || [];

        const alchemyProgress = stats.alchemyProgress || 0;
        const MAX_ACTIVE_SKILLS = getMaxActiveSkills(alchemyProgress);

        const activeList = activeSkills.length
            ? activeSkills
                  .map((skill) => {
                      const specialSkill = specialSkills.find(
                          (s) => s.skillName === skill,
                      );
                      return specialSkill
                          ? `${specialSkill.emoji} **${skill}**`
                          : `${getSkillEmoji(skill)} **${skill}**`;
                  })
                  .join("\n")
            : "You have no active skills.";

        const skillsList = learnedSkills.length
            ? learnedSkills
                  .map(
                      (skill) =>
                          `${getSkillEmoji(skill.name)} **${
                              skill.name
                          }** (Level: ${skill.level})`,
                  )
                  .join("\n")
            : "You haven't learned any skills yet.";

        const specialSkillsList = unlockedSpecialSkills.length
            ? unlockedSpecialSkills
                  .map((skillName) => {
                      const skill = specialSkills.find(
                          (s) => s.skillName === skillName,
                      );
                      return skill
                          ? `${skill.emoji} **${skill.skillName}**`
                          : `✨ **${skillName}**`;
                  })
                  .join("\n")
            : "You have not unlocked any special skills yet.";

        const embedColor = stats.abyssMode ? "#b84df1" : "Aqua";

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${i.user.username}'s Skills`)
            .setThumbnail(i.user.displayAvatarURL())
            .setDescription(
                `- Use </learn:1282044626408308736> to learn new skills.\n- Use </activate:1284399993897353292> to enable/disable a skill.\n- Use </upgrade:1310180403385991250> to level up a skill.`,
            )
            .addFields(
                {
                    name: `Active Skills (${activeSkills.length}/${MAX_ACTIVE_SKILLS})`,
                    value: activeList,
                    inline: true,
                },
                { name: "Learned Skills", value: skillsList, inline: true },
                {
                    name: "Special Skills",
                    value: specialSkillsList,
                    inline: false,
                },
            );

        await i.editReply({ embeds: [embed] });
    },
});
