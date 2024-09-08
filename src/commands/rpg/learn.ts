import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    removeBalance,
    updateUserStats,
} from "../../services";

type SkillName = "Vigilance" | "Leech" | "Appraise" | "Totem" | "Insomnia";

const skillRequirements: Record<
    SkillName,
    {
        worldLevel: number;
        coins: number;
        items: { item: string; amount: number }[];
    }
> = {
    Vigilance: {
        worldLevel: 2,
        coins: 100,
        items: [
            { item: "Ominous Mask", amount: 2 },
            { item: "Divining Scroll", amount: 3 },
        ],
    },
    Leech: {
        worldLevel: 3,
        coins: 150,
        items: [{ item: "Slime Concentrate", amount: 2 }],
    },
    Appraise: {
        worldLevel: 1,
        coins: 50,
        items: [
            { item: "Slime Condensate", amount: 2 },
            { item: "Sharp Arrowhead", amount: 2 },
        ],
    },
    Totem: {
        worldLevel: 1,
        coins: 100,
        items: [{ item: "Stained Mask", amount: 5 }],
    },
    Insomnia: {
        worldLevel: 4,
        coins: 250,
        items: [
            { item: "Firm Arrowhead", amount: 3 },
            { item: "Sealed Scroll", amount: 5 },
        ],
    },
};

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
                    { name: "Vigilance", value: "Vigilance" },
                    { name: "Leech", value: "Leech" },
                    { name: "Appraise", value: "Appraise" },
                    { name: "Totem", value: "Totem" },
                    { name: "Insomnia", value: "Insomnia" },
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

        const skillData = skillRequirements[skillName];

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

        const missingRequirements: string[] = [];

        if (stats.worldLevel < skillData.worldLevel) {
            missingRequirements.push(
                `**World Level**: You need to be at least **World Level ${skillData.worldLevel}**.`,
            );
        }

        if (userProfile.balance < skillData.coins) {
            missingRequirements.push(
                `**Coins**: You need at least **${skillData.coins} coins**.`,
            );
        }

        for (const reqItem of skillData.items) {
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

        for (const reqItem of skillData.items) {
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
                skillData.coins,
                true,
                `Learned skill ${skillName}`,
            ),
            updateUserStats(i.user.id, {
                inventory: {
                    set: stats.inventory,
                },
                skills: [...stats.skills, { name: skillName, level: 1 }],
            }),
        ]);

        return r.edit(
            embedComment(`You have learned the skill "${skillName}"!`),
        );
    },
});
