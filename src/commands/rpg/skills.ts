import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import {
    ActionRowBuilder,
    ButtonBuilder,
    type ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    type Message,
    SlashCommandBuilder,
} from "discord.js";
import { getUserStats } from "../../services";
import { skills } from "../../utils/skillsData";

function getMaxActiveSkills(alchemyProgress: number): number {
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
            "[RPG] Displays a list of your active and learned skills.",
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

        const alchemyProgress = stats.alchemyProgress || 0;
        const MAX_ACTIVE_SKILLS = getMaxActiveSkills(alchemyProgress);

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

        const embedColor = stats.abyssMode ? "#b84df1" : "Aqua";

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${i.user.username}'s Skills`)
            .setThumbnail(i.user.displayAvatarURL())
            .setDescription(
                `- Use </learn:1282044626408308736> to learn new skills.\n- Use </activate:1284399993897353292> to enable/disable a skill.`,
            )
            .addFields(
                {
                    name: `Active Skills (${activeSkills.length}/${MAX_ACTIVE_SKILLS})`,
                    value: activeList,
                    inline: true,
                },
                { name: "Learned Skills", value: skillsList, inline: true },
            );

        const viewAllSkillsButton = new ButtonBuilder()
            .setCustomId("view_all_skills")
            .setLabel("View All Skills")
            .setStyle(ButtonStyle.Primary);

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            viewAllSkillsButton,
        );

        await i.editReply({ embeds: [embed], components: [actionRow] });

        const message = (await i.fetchReply()) as Message;

        const filter = (interaction: ButtonInteraction) =>
            interaction.customId === "view_all_skills" &&
            interaction.user.id === i.user.id;

        try {
            const buttonInteraction = await message.awaitMessageComponent({
                filter,
                componentType: ComponentType.Button,
                time: 60000,
            });

            const allSkillsList = skills
                .map(
                    (skill) =>
                        `${skill.emoji} **${skill.name}**: ${skill.description}`,
                )
                .join("\n");

            const allSkillsEmbed = new EmbedBuilder()
                .setColor("Aqua")
                .setTitle("All Skills")
                .setDescription(allSkillsList);

            await buttonInteraction.reply({
                embeds: [allSkillsEmbed],
                ephemeral: true,
            });
        } catch (error) {
            noop();
        }

        viewAllSkillsButton.setDisabled(true);
        const disabledActionRow =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                viewAllSkillsButton,
            );
        await message.edit({ components: [disabledActionRow] }).catch(noop);
    },
});
