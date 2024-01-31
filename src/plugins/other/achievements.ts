import type { SlashCommandIntegerOption } from "discord.js";
import { prisma } from "../../prisma";

export function getGameName(game: number) {
    switch (game) {
        case 1:
            return "Star Rail";
        default:
            return "Genshin";
    }
}

export function getDiffName(diff: number) {
    switch (diff) {
        case 1:
            return "Medium";
        case 2:
            return "Hard";
        case 3:
            return "Extreme";
        default:
            return "Easy";
    }
}

export function addGameOption(
    builder: SlashCommandIntegerOption,
    required = true,
) {
    return builder
        .setName(`game`)
        .setDescription(`Which game?`)
        .setRequired(required)
        .addChoices(
            { name: "Genshin", value: 0 },
            { name: "Star Rail", value: 1 },
        );
}

export function addGameDiff(
    builder: SlashCommandIntegerOption,
    required = true,
) {
    return builder
        .setName(`diff`)
        .setDescription(`What is the difficulty?`)
        .setRequired(required)
        .addChoices(
            { name: "Easy", value: 0 },
            { name: "Medium", value: 1 },
            { name: "Hard", value: 2 },
            { name: "Extreme", value: 3 },
        );
}

export async function getAchievements(client: string) {
    return prisma.gameAchievements
        .upsert({
            where: { client },
            create: { client },
            update: {},
        })
        .catch(() => null);
}

export type Achievement = {
    name: string; // Name of the achievement
    game: 0 | 1; // 0: Genshin, 1: Star Rail
    id: number; // ID for the Achievement
    diff: 0 | 1 | 2 | 3; // 0: Easy, 1: Medium, 2: Hard, 3 Extreme
};
export const achievementTypes = {
    0: "Easy",
    1: "Medium",
    2: "Hard",
    3: "Extreme",
};

export const achievementEmojis = {
    0: "<:GreenDot:1110060771192344626>",
    1: "<:Dot:1110059185397317763>",
    2: "<:RedDot:1110060610164621392>",
    3: "<:PurpleDot:1135456946468687972>",
};
