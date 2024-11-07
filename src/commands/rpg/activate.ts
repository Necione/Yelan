import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { skills } from "../../utils/skillsData";

const sinSkills = ["Wrath", "Sloth", "Pride", "Greed"];

function getMaxActiveSkills(alchemyProgress: number): number {
    return alchemyProgress >= 100 ? 6 : 5;
}

const skillChoices = skills.map((skill) => ({
    name: `${skill.emoji} ${skill.name}`,
    value: skill.name,
}));

export const activate = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("activate")
        .setDescription("[RPG] Activate or deactivate a learned skill.")
        .addStringOption((option) =>
            option
                .setName("skill")
                .setDescription("The skill you want to activate or deactivate")
                .setRequired(true)
                .addChoices(...skillChoices),
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

        const alchemyProgress = stats.alchemyProgress || 0;
        const MAX_ACTIVE_SKILLS = getMaxActiveSkills(alchemyProgress);

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

        if (sinSkills.includes(skillName)) {
            const activeSinSkills = activeSkills.filter((skill) =>
                sinSkills.includes(skill),
            );

            if (activeSinSkills.length >= 1) {
                return r.edit(
                    embedComment(
                        `You can only have one Sin skill active at a time. Currently active: **${activeSinSkills.join(
                            ", ",
                        )}**.`,
                    ),
                );
            }
        }

        if (activeSkills.length >= MAX_ACTIVE_SKILLS) {
            return r.edit(
                embedComment(
                    `You can only have ${MAX_ACTIVE_SKILLS} active skills at a time based on your Alchemy rank.`,
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
            embedComment(
                `The skill "${skillName}" has been activated!\nUse the command again to deactivate.`,
            ),
        );
    },
});
