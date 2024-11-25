import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { skills } from "../../utils/skillsData";
import { specialSkills } from "../../utils/specialSkills";

const sinSkills = ["Wrath", "Sloth", "Pride", "Greed"];
const mutuallyExclusiveSkills = ["Crystallize", "Fatigue"];

function getMaxActiveSkills(alchemyProgress: number): number {
    if (alchemyProgress >= 360) {
        return 7;
    } else if (alchemyProgress >= 100) {
        return 6;
    } else {
        return 5;
    }
}

export const activate = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("activate")
        .setDescription("[RPG] Activate or deactivate a learned skill.")
        .addStringOption((option) =>
            option
                .setName("skill")
                .setDescription("The skill you want to activate or deactivate")
                .setRequired(true)
                .setAutocomplete(true),
        ),
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
        const unlockedSpecialSkills = stats.unlockedSpecialSkills || [];

        const alchemyProgress = stats.alchemyProgress || 0;
        const MAX_ACTIVE_SKILLS = getMaxActiveSkills(alchemyProgress);

        const isSpecialSkill = specialSkills.some(
            (skill) => skill.skillName === skillName,
        );
        if (isSpecialSkill && !unlockedSpecialSkills.includes(skillName)) {
            return r.edit(
                embedComment(
                    `The special skill "${skillName}" is not yet unlocked.`,
                ),
            );
        }

        const isLearned = learnedSkills.find(
            (skill) => skill.name === skillName,
        );
        const isUnlockedSpecial =
            isSpecialSkill && unlockedSpecialSkills.includes(skillName);

        if (!isLearned && !isUnlockedSpecial) {
            return r.edit(
                embedComment(
                    `You haven't learned or unlocked the skill "${skillName}" yet.`,
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

        if (mutuallyExclusiveSkills.includes(skillName)) {
            const activeExclusiveSkills = activeSkills.filter((skill) =>
                mutuallyExclusiveSkills.includes(skill),
            );

            if (activeExclusiveSkills.length >= 1) {
                return r.edit(
                    embedComment(
                        `You cannot activate "${skillName}" while the following skill is active: **${activeExclusiveSkills.join(
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
