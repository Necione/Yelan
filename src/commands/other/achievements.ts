import { EmbedBuilder } from "@discordjs/builders";
import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, time } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import {
    achievementEmojis,
    achievementTypes,
    addGameOption,
    getAchievements,
    getGameName,
    type Achievement,
} from "../../plugins/other/achievements";
import { profileHidden } from "../../plugins/profile/utils";
import { getProfileByUserId, updateUserProfile } from "../../services";
import { userLockedData } from "../../utils";

export const achievements = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`achievements`)
        .setDescription(`View achievements`)
        .setDMPermission(false)
        .addIntegerOption((o) =>
            o
                .setName("difficulty")
                .setDescription("Select the difficulty level")
                .addChoices(
                    { name: "Easy", value: 0 },
                    { name: "Medium", value: 1 },
                    { name: "Hard", value: 2 },
                    { name: "Extreme", value: 3 },
                )
                .setRequired(true),
        )
        .addIntegerOption((o) => addGameOption(o, true))
        .addUserOption((o) =>
            o
                .setName("user")
                .setDescription(`What user's achievements do you want to view?`)
                .setRequired(false),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const user = i.options.getUser("user", false) ?? i.user;
        if (user.bot) {
            return r.edit(embedComment(`Bots don't have a profile.`));
        }
        const author = i.user.id === user.id;
        const data = await getProfileByUserId(user.id);
        if (!author && data.hidden) {
            return r.edit(profileHidden());
        }
        if (data.locked) {
            return r.edit(userLockedData(user.id));
        }
        if (!is.array(data.achievements)) {
            return r.edit(
                embedComment(
                    `${
                        author ? "You" : `${user.toString()}`
                    } don't have any achievements to show!`,
                ),
            );
        }
        let shouldFix = false;
        data.achievements = data.achievements.map((c) => {
            if (!is.number(c.game, false)) {
                c.game = 0;
                shouldFix = true;
            }
            return c;
        });
        if (shouldFix) {
            await updateUserProfile(user.id, {
                achievements: {
                    set: data.achievements,
                },
            });
        }
        const achlist = await getAchievements(i.client.user.id);
        const AC = achlist?.achievements || [];
        const selectedDifficulty = i.options.getInteger(
            "difficulty",
            true,
        ) as Achievement["diff"];
        const gameId = i.options.getInteger("game", false) || 0;

        const embed = new EmbedBuilder()
            .setTitle(
                `${author ? "Your" : `${user.username}'s`} ${getGameName(
                    gameId,
                )} ${achievementTypes[selectedDifficulty]} Achievements`,
            )
            .setColor(0xc0f6fb)
            .setThumbnail(user.displayAvatarURL());

        // Populate the fields object with the achievements
        const achievementsToShow = [];
        let totalCompleted = 0;
        for (const ac of data.achievements) {
            if (ac.game !== gameId) {
                continue;
            }
            if (ac.achieved && ac.has) {
                if (selectedDifficulty === ac.difficulty) {
                    totalCompleted++;
                    achievementsToShow.push(
                        `${achievementEmojis[ac.difficulty]} \`${
                            ac.name
                        }\` | Achieved ${time.relative(new Date(ac.achieved))}`,
                    );
                }
            }
        }

        const description = `View the list of achievements in <#1135010490184118312>.\n\n`;
        if (is.array(achievementsToShow)) {
            embed.setDescription(
                `${description}${achievementsToShow.join(
                    "\n",
                )}\n\n${totalCompleted} out of ${
                    AC.filter(
                        (c) =>
                            c.diff === selectedDifficulty && c.game === gameId,
                    ).length
                } ${
                    achievementTypes[selectedDifficulty]
                } achievements completed.`,
            );
        } else {
            embed.setDescription(
                `${description}No ${achievementTypes[selectedDifficulty]} achievements to show!`,
            );
        }

        return r.edit({
            embeds: [embed],
        });
    },
});
