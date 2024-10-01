import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getUserStats } from "../../services";

const availableSkills = [
    {
        name: "Vigilance",
        description:
            "Attack twice at the start of battle, the second attack dealing 50% your base ATK",
        emoji: "✨",
    },
    {
        name: "Leech",
        description:
            "Gain 10% lifesteal from the enemy's Max HP 50% of the time",
        emoji: "💖",
    },
    {
        name: "Appraise",
        description: "Sell things for a little bit more than they're worth",
        emoji: "🔍",
    },
    {
        name: "Totem",
        description: "Heal 5% of your Max HP after every battle",
        emoji: "⭐",
    },
    {
        name: "Insomnia",
        description: "Reduce your hunt cooldown from 30 minutes to 20 minutes",
        emoji: "🌙",
    },
    {
        name: "Kindle",
        description: "Deal 10% of your Max HP as bonus damage per turn",
        emoji: "💥",
    },
    {
        name: "Scrounge",
        description: `In addition to drops, earn ${texts.c.u} per hunt`,
        emoji: "💸",
    },
    {
        name: "Energize",
        description:
            "Reduce your explore cooldown from 20 minutes to 15 minutes",
        emoji: "⚡",
    },
    {
        name: "Distraction",
        description: "Go first 75% of the time when hunting",
        emoji: "💫",
    },
    {
        name: "Backstab",
        description: "Deal 150% more DMG to humans",
        emoji: "🔪",
    },
    {
        name: "Heartbroken",
        description: "Deal some of your HP as bonus DMG on your first turn",
        emoji: "💔",
    },
];

const getSkillEmoji = (skillName: string) => {
    const skill = availableSkills.find((s) => s.name === skillName);
    return skill ? skill.emoji : "";
};

export const skills = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("skills")
        .setDescription(
            "[RPG] Displays a list of your learned skills and available skills.",
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

        const activeList = activeSkills.length
            ? activeSkills
                  .map((skill) => `${getSkillEmoji(skill)} **${skill}**`)
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

        const filteredAvailableSkills = availableSkills.filter(
            (skill) =>
                !learnedSkills.some((learned) => learned.name === skill.name),
        );

        const availableSkillsList = filteredAvailableSkills.length
            ? filteredAvailableSkills
                  .map(
                      (skill) =>
                          `${skill.emoji} **${skill.name}**: ${skill.description}`,
                  )
                  .join("\n")
            : "You have learned all available skills.";

        const embed = new EmbedBuilder()
            .setColor("Aqua")
            .setDescription(
                `- Use </learn:1282044626408308736> command to get new skills\n- Use </activate:1284399993897353292> to enable/disable a skill`,
            )
            .setTitle(`${i.user.username}'s Skills`)
            .addFields(
                {
                    name: `Active Skills (${activeSkills.length}/5`,
                    value: activeList,
                    inline: true,
                },
                { name: "Learned Skills", value: skillsList, inline: true },
                { name: "Learnable Skills", value: availableSkillsList },
            );

        await r.edit({ embeds: [embed] });
    },
});
