import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    Message,
    SlashCommandBuilder,
} from "discord.js";
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
            "Gain 5% lifesteal from each enemy's Max HP 50% of the time",
        emoji: "💖",
    },
    {
        name: "Vampirism",
        description: "Gain 20% lifesteal from each enemy's Max HP on victory",
        emoji: "🦇",
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
        description: `In addition to drops, earn coins per hunt`,
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
        name: "Growth",
        description: "Earn 200% more EXP at the end of each battle",
        emoji: "🌱",
    },
    {
        name: "Heartbroken",
        description: "Deal 1/4 of your HP as bonus DMG on your first turn",
        emoji: "💔",
    },
    {
        name: "Crystallize",
        description: "Monsters deal less DMG early, but more later on",
        emoji: "🧊",
    },
    {
        name: "Sloth",
        description: "Start each round with 125% your current HP",
        emoji: "💤",
    },
    {
        name: "Wrath",
        description: "Deal 150% more DMG, start each round with 25% less HP",
        emoji: "💢",
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

        const embed = new EmbedBuilder()
            .setColor("Aqua")
            .setTitle(`${i.user.username}'s Skills`)
            .setThumbnail(i.user.displayAvatarURL())
            .setDescription(
                `- Use </learn:1282044626408308736> to learn new skills.\n- Use </activate:1284399993897353292> to enable/disable a skill.`,
            )
            .addFields(
                {
                    name: `Active Skills (${activeSkills.length}/5)`,
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

            const allSkillsList = availableSkills
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
        } catch (noop) {}

        viewAllSkillsButton.setDisabled(true);
        const disabledActionRow =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                viewAllSkillsButton,
            );
        await message.edit({ components: [disabledActionRow] }).catch(noop);
    },
});
