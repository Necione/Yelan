import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";

const MAX_ACTIVE_SKILLS = 5;

const skillChoices = [
    { name: "Vigilance", value: "Vigilance", emoji: "✨" },
    { name: "Leech", value: "Leech", emoji: "💖" },
    { name: "Appraise", value: "Appraise", emoji: "🔍" },
    { name: "Totem", value: "Totem", emoji: "⭐" },
    { name: "Insomnia", value: "Insomnia", emoji: "🌙" },
    { name: "Kindle", value: "Kindle", emoji: "💥" },
    { name: "Resurrect", value: "Resurrect", emoji: "👼" },
    { name: "Scrounge", value: "Scrounge", emoji: "💸" },
    { name: "Focus", value: "Focus", emoji: "👁️" },
    { name: "Doppelganger", value: "Doppelganger", emoji: "👥" },
];

export const activate = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("activate")
        .setDescription("[RPG] Activate or deactivate a learned skill.")
        .addStringOption((option) =>
            option
                .setName("skill")
                .setDescription("The skill you want to activate or deactivate")
                .setRequired(true)
                .addChoices(
                    ...skillChoices.map((skill) => ({
                        name: `${skill.emoji} ${skill.name}`,
                        value: skill.value,
                    })),
                ),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const skillName = i.options.getString("skill", true);
        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        const learnedSkills = stats.skills || [];
        let activeSkills = stats.activeSkills || [];

        const skillToActivate = learnedSkills.find(
            (skill) => skill.name === skillName,
        );
        if (!skillToActivate) {
            return r.edit(
                embedComment(
                    `You haven't learned the skill "${skillName}" yet.`,
                ),
            );
        }

        if (activeSkills.includes(skillName)) {
            activeSkills = activeSkills.filter((skill) => skill !== skillName);

            await updateUserStats(i.user.id, {
                activeSkills: {
                    set: activeSkills,
                },
            });

            return r.edit(
                embedComment(`The skill "${skillName}" has been deactivated.`),
            );
        }

        if (activeSkills.length >= MAX_ACTIVE_SKILLS) {
            return r.edit(
                embedComment(
                    `You can only have ${MAX_ACTIVE_SKILLS} active skills at a time.`,
                ),
            );
        }

        activeSkills.push(skillName);

        await updateUserStats(i.user.id, {
            activeSkills: {
                set: activeSkills,
            },
        });

        return r.edit(
            embedComment(`The skill "${skillName}" has been activated!`),
        );
    },
});
