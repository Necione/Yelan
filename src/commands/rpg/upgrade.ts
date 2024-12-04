import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { skills } from "../../utils/skillsData";

export const upgrade = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("upgrade")
        .setDescription("[RPG] Upgrade a learned skill by 1 level.")
        .addStringOption((option) =>
            option
                .setName("skill")
                .setDescription("The skill you want to upgrade")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .setDMPermission(false),
    defer: { silent: false },
    async autocomplete(i) {
        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return i
                .respond([{ name: "No skills found.", value: "n/a" }])
                .catch(noop);
        }

        if (
            stats.totalTokensUsed === null ||
            stats.totalTokensUsed === undefined
        ) {
            stats.totalTokensUsed = stats.skills.reduce(
                (sum, skill) => sum + (skill.level - 1),
                0,
            );
            await updateUserStats(i.user.id, {
                totalTokensUsed: { set: stats.totalTokensUsed },
            });
        }

        const learnedSkills = stats.skills || [];

        const options = learnedSkills
            .filter((skill) => {
                const skillData = skills.find((s) => s.name === skill.name);
                if (!skillData) {
                    return false;
                }
                const maxLevel = skillData.levels.length;
                return skill.level < maxLevel;
            })
            .map((skill) => ({
                name: `${skill.name} (Level ${skill.level})`,
                value: skill.name,
            }));

        const searchTerm = i.options.getFocused()?.toLowerCase() || "";

        const filteredOptions = options.filter((option) =>
            option.name.toLowerCase().includes(searchTerm),
        );

        return i.respond(filteredOptions.slice(0, 25)).catch(noop);
    },
    async execute(i, r) {
        const skillName = i.options.getString("skill", true);

        if (skillName === "n/a") {
            return r.edit(embedComment(`You didn't select a valid skill.`));
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        if (
            stats.totalTokensUsed === null ||
            stats.totalTokensUsed === undefined
        ) {
            stats.totalTokensUsed = stats.skills.reduce(
                (sum, skill) => sum + (skill.level - 1),
                0,
            );
            await updateUserStats(i.user.id, {
                totalTokensUsed: { set: stats.totalTokensUsed },
            });
        }

        const userSkill = stats.skills.find(
            (skill) => skill.name === skillName,
        );
        if (!userSkill) {
            return r.edit(
                embedComment(
                    `You haven't learned the skill "${skillName}" yet.`,
                ),
            );
        }

        const skillData = skills.find((skill) => skill.name === skillName);
        if (!skillData) {
            return r.edit(
                embedComment(`The skill "${skillName}" does not exist.`),
            );
        }

        const maxLevel = skillData.levels.length;

        if (userSkill.level >= maxLevel) {
            return r.edit(
                embedComment(
                    `Your "${skillName}" skill is already at the maximum level (${maxLevel}).`,
                ),
            );
        }

        const tokensAvailable = stats.rebirths - stats.totalTokensUsed;

        if (tokensAvailable < 1) {
            return r.edit(
                embedComment(
                    `You don't have any Tokens available to upgrade skills. Rebirth to earn more Tokens.`,
                ),
            );
        }

        userSkill.level += 1;
        stats.totalTokensUsed += 1;

        await updateUserStats(i.user.id, {
            skills: {
                updateMany: {
                    where: { name: skillName },
                    data: { level: userSkill.level },
                },
            },
            totalTokensUsed: { set: stats.totalTokensUsed },
        });

        return r.edit(
            embedComment(
                `Successfully upgraded "${skillName}" to Level ${
                    userSkill.level
                }! You have ${tokensAvailable - 1} Token(s) remaining.`,
                "Green",
            ),
        );
    },
});
