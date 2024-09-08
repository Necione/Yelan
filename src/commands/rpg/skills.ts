import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getUserStats } from "../../services";

const availableSkills = [
    {
        name: "Vigilance",
        description:
            "Attack twice at the start of battle, the second attack dealing 50% your normal ATK",
        emoji: "✨",
    },
    {
        name: "Leech",
        description:
            "Gain 2% lifesteal from the enemy's Max HP 50% of the time",
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
];

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

        const skillsList = learnedSkills.length
            ? learnedSkills
                  .map((skill) => `**${skill.name}** (Level: ${skill.level})`)
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
            .setTitle(`${i.user.username}'s Skills`)
            .addFields(
                { name: "Skills Learned", value: skillsList },
                { name: "Skills Available", value: availableSkillsList },
            );

        await r.edit({ embeds: [embed] });
    },
});
