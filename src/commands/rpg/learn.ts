import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, make } from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    removeBalance,
    updateUserStats,
} from "../../services";
import { type SkillName, skillsMap } from "../../utils/skillsData";

export const learn = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("learn")
        .setDescription("[RPG] Learn a new skill.")
        .addStringOption((option) =>
            option
                .setName("skill")
                .setDescription("The skill you want to learn")
                .setRequired(true)
                .addChoices(
                    ...Object.values(skillsMap).map((skill) => ({
                        name: skill.name,
                        value: skill.name,
                    })),
                ),
        ),

    defer: { silent: false },
    async execute(i, r) {
        const skillName = i.options.getString("skill", true) as SkillName;
        const userProfile = await getProfileByUserId(i.user.id);
        const stats = await getUserStats(i.user.id);

        if (!userProfile) {
            return r.edit(
                embedComment(
                    `No profile found for you, please set up your profile.`,
                ),
            );
        }

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        if (stats.isHunting) {
            return r.edit(embedComment("You cannot learn while hunting!"));
        }

        const skillData = skillsMap[skillName];

        if (!skillData) {
            return r.edit(
                embedComment(`The skill "${skillName}" does not exist.`),
            );
        }

        const existingSkill = stats.skills.find(
            (skill) => skill.name === skillName,
        );
        if (existingSkill) {
            return r.edit(
                embedComment(`You already know the skill "${skillName}".`),
            );
        }

        const missingRequirements = make.array<string>();

        if (
            skillData.requirements?.rebirthsRequired &&
            (stats.rebirths || 0) < skillData.requirements?.rebirthsRequired
        ) {
            missingRequirements.push(
                `**Rebirths**: You need to have at least **${
                    skillData.requirements.rebirthsRequired
                } Rebirth${
                    skillData.requirements.rebirthsRequired > 1 ? "s" : ""
                }**.`,
            );
        }

        if (
            stats.adventureRank < (skillData.requirements?.adventureRank || 0)
        ) {
            missingRequirements.push(
                `**Adventure Rank**: You need to be at least **Adventure Rank ${skillData.requirements?.adventureRank}**.`,
            );
        }

        if (userProfile.balance < (skillData.requirements?.coins || 0)) {
            missingRequirements.push(
                `**${texts.c.u}**: You need at least **${skillData.requirements?.coins} ${texts.c.u}**.`,
            );
        }

        for (const reqItem of skillData.requirements?.items || []) {
            const invItem = stats.inventory.find(
                (item) => item.item === reqItem.item,
            );
            if (!invItem || invItem.amount < reqItem.amount) {
                missingRequirements.push(
                    `**Items**: You need **${reqItem.amount}x ${reqItem.item}**.`,
                );
            }
        }

        if (missingRequirements.length > 0) {
            return r.edit(
                embedComment(
                    `You cannot learn the skill **${skillName}** yet. Here are the missing requirements:\n\n${missingRequirements.join(
                        "\n",
                    )}`,
                ),
            );
        }

        for (const reqItem of skillData.requirements?.items || []) {
            const invItem = stats.inventory.find(
                (item) => item.item === reqItem.item,
            );
            if (invItem) {
                invItem.amount -= reqItem.amount;
                if (invItem.amount <= 0) {
                    stats.inventory = stats.inventory.filter(
                        (item) => item.item !== invItem.item,
                    );
                }
            }
        }

        await Promise.all([
            removeBalance(
                i.user.id,
                skillData.requirements?.coins || 0,
                true,
                `Learned skill ${skillName}`,
            ),
            updateUserStats(i.user.id, {
                inventory: {
                    set: stats.inventory,
                },
                skills: {
                    set: [...stats.skills, { name: skillName, level: 1 }],
                },
            }),
        ]);

        return r.edit(
            embedComment(`You have learned the skill "${skillName}"!`),
        );
    },
});
