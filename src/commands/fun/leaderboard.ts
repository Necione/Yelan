import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, formatNumber } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import {
    configurationByType,
    handleLeaderboard,
    type LeaderboardType,
} from "../../plugins/other/leaderboard";
import { levels } from "../../services/levels";

export const leaderboard = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`leaderboard`)
        .setDescription(`Display the leaderboards!`)
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setRequired(true)
                .setName("type")
                .setDescription("Type of leaderboard")
                .addChoices(
                    ...Object.keys(configurationByType).map(
                        (leaderboardType) => ({
                            name: configurationByType[leaderboardType]
                                .displayText,
                            value: leaderboardType,
                        }),
                    ),
                ),
        )
        .addIntegerOption((o) =>
            o
                .setName(`page`)
                .setDescription(`What page? (only available to: levels)`)
                .setRequired(false),
        )
        .addUserOption((o) =>
            o
                .setName(`user`)
                .setDescription(
                    `Search for a certain user's leaderboard position`,
                )
                .setRequired(false),
        ),
    defer: {
        silent: false,
    },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        levels.client = i.client;
        const user = i.options.getUser("user", false) || null;
        const lbType = i.options.getString("type", true) as LeaderboardType;
        if (lbType === "levels") {
            if (user && !user.bot) {
                const position = await levels.api.users.position(
                    user.id,
                    i.guildId,
                );
                return r.edit(
                    embedComment(
                        `${customEmoji.a.z_elo} ${user.toString()} (\`${
                            user.username
                        }\`) is (**#${formatNumber(position)}**) in the (**${
                            configurationByType[lbType].displayText
                        }**) leaderboard!`,
                        "Green",
                    ),
                );
            }
            const lb = await levels.api.getLeaderboard(i.guildId, {
                page: i.options.getInteger("page", false) || 1,
            });
            if (!lb.status) {
                return r.edit(embedComment(lb.message));
            }
            return r.edit({
                files: [
                    {
                        name: "lb.png",
                        attachment: lb.image,
                        description: `Page ${lb.query.page} of ${lb.query.pages}`,
                    },
                ],
            });
        }
        return handleLeaderboard(configurationByType[lbType], i, user);
    },
});
