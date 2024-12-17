import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { skills } from "../../utils/skillsData";
import { specialSkills } from "../../utils/specialSkills";

const forbiddenCombinations = [
    ["Drain", "Leech"],
    ["Crystallize", "Fatigue"],
    ["Wrath", "Sloth", "Pride", "Greed"],
];

function getMaxActiveSkills(alchemyProgress: number) {
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

        let activeSkills = stats.activeSkills || [];
        const learnedSkills = stats.skills || [];
        const unlockedSpecialSkills = stats.unlockedSpecialSkills || [];

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

        const skillData = skills.find((s) => s.name === skillName);
        if (skillData && skillData.passive) {
            return r.edit(embedComment("You cannot activate a passive skill."));
        }

        if (activeSkills.includes(skillName)) {
            activeSkills = activeSkills.filter((skill) => skill !== skillName);
            await updateUserStats(i.user.id, {
                activeSkills: { set: activeSkills },
            });

            return r.edit(
                embedComment(`The skill "${skillName}" has been deactivated.`),
            );
        }

        for (const combo of forbiddenCombinations) {
            if (combo.includes(skillName)) {
                const conflictingSkills = combo.filter(
                    (skill) =>
                        skill !== skillName && activeSkills.includes(skill),
                );
                if (conflictingSkills.length > 0) {
                    return r.edit(
                        embedComment(
                            `You cannot activate "${skillName}" while the following skill(s) are active: **${conflictingSkills.join(
                                ", ",
                            )}**.`,
                        ),
                    );
                }
            }
        }

        const alchemyProgress = stats.alchemyProgress || 0;
        const MAX_ACTIVE_SKILLS = getMaxActiveSkills(alchemyProgress);
        if (activeSkills.length >= MAX_ACTIVE_SKILLS) {
            return r.edit(
                embedComment(
                    `You can only have ${MAX_ACTIVE_SKILLS} active skills at a time.`,
                ),
            );
        }

        activeSkills.push(skillName);
        await updateUserStats(i.user.id, {
            activeSkills: { set: activeSkills },
        });

        return r.edit(
            embedComment(
                `The skill "${skillName}" has been activated!\nUse the command again to deactivate.`,
            ),
        );
    },
});
