import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getUserStats } from "../../services";
import { getPaginatedMessage } from "../../utils";
import { skills } from "../../utils/skillsData";
import { specialSkills } from "../../utils/specialSkills";

function getMaxActiveSkills(alchemyProgress: number) {
    if (alchemyProgress >= 360) {
        return 7;
    } else if (alchemyProgress >= 100) {
        return 6;
    } else {
        return 5;
    }
}

const getSkillEmoji = (skillName: string) => {
    const skill = skills.find((s) => s.name === skillName);
    return skill ? skill.emoji : "";
};

export const skillsCommand = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("skills")
        .setDescription(
            "[RPG] Displays your skills or details about a specific skill.",
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

        const learnedSkills = stats.skills || [];
        const activeSkills = stats.activeSkills || [];
        const unlockedSpecialSkills = stats.unlockedSpecialSkills || [];

        const alchemyProgress = stats.alchemyProgress || 0;
        const MAX_ACTIVE_SKILLS = getMaxActiveSkills(alchemyProgress);

        const learnedPassiveSkills = learnedSkills.filter((s) => {
            const skillData = skills.find((sk) => sk.name === s.name);
            return skillData?.passive;
        });

        const activeList = activeSkills.length
            ? activeSkills
                  .map((skill) => {
                      const skillData = learnedSkills.find(
                          (s) => s.name === skill,
                      );
                      const skillLevel = skillData
                          ? ` \`(Lv${skillData.level})\``
                          : "";
                      const specialSkill = specialSkills.find(
                          (s) => s.skillName === skill,
                      );
                      return specialSkill
                          ? `${specialSkill.emoji} **${skill}**${skillLevel}`
                          : `${getSkillEmoji(skill)} **${skill}**${skillLevel}`;
                  })
                  .join("\n")
            : "You have no active skills.";

        const passiveSkillsList = learnedPassiveSkills.length
            ? learnedPassiveSkills
                  .map(
                      (skill) =>
                          `${getSkillEmoji(skill.name)} **${
                              skill.name
                          }** \`(Lv${skill.level})\``,
                  )
                  .join("\n")
            : "You have not unlocked any passive skills yet.";

        const allLearnedSkills = learnedSkills.length
            ? learnedSkills
                  .map(
                      (skill) =>
                          `${getSkillEmoji(skill.name)} **${
                              skill.name
                          }** \`(Lv${skill.level})\``,
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

        const pager = getPaginatedMessage();

        const page1 = new EmbedBuilder()
            .setColor(0xf7b420)
            .setTitle(`${i.user.username}'s Skills (Page 1)`)
            .setThumbnail(`https://lh.elara.workers.dev/rpg/skills.png`)
            .setDescription(
                `- Use </learn:1282044626408308736> to learn new skills.\n- Use </activate:1284399993897353292> to enable/disable a skill.\n- Use </upgrade:1310180403385991250> to level up a skill.`,
            )
            .addFields(
                {
                    name: `Active Skills (${activeSkills.length}/${MAX_ACTIVE_SKILLS})`,
                    value: activeList,
                    inline: true,
                },
                {
                    name: "Passive Skills",
                    value: passiveSkillsList,
                    inline: true,
                },
            );

        const page2 = new EmbedBuilder()
            .setColor(0xf7b420)
            .setTitle(`${i.user.username}'s Skills (Page 2)`)
            .setThumbnail(i.user.displayAvatarURL())
            .setDescription(
                `- Use </learn:1282044626408308736> to learn new skills.\n- Use </activate:1284399993897353292> to enable/disable a skill.\n- Use </upgrade:1310180403385991250> to level up a skill.`,
            )
            .addFields(
                {
                    name: "Learned Skills",
                    value: allLearnedSkills,
                    inline: true,
                },
                {
                    name: "Special Skills",
                    value: specialSkillsList,
                    inline: true,
                },
            );

        pager.pages.push({ embeds: [page1] });
        pager.pages.push({ embeds: [page2] });

        return pager.run(i, i.user).catch(noop);
    },
});
