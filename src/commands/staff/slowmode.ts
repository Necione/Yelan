import {
    buildCommand,
    getStr,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { Duration } from "@elara-services/packages";
import { embedComment, error, is, ms } from "@elara-services/utils";
import { ChannelType, SlashCommandBuilder } from "discord.js";
import { roles } from "../../config";

const channelTypes = [
    ChannelType.AnnouncementThread,
    ChannelType.GuildText,
    ChannelType.GuildVoice,
    ChannelType.PrivateThread,
    ChannelType.PublicThread,
    ChannelType.GuildStageVoice,
];

export const slowmode = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`slowmode`)
        .setDescription(`Enable/Disable slowmode for a channel`)
        .setDMPermission(false)
        .addStringOption((o) =>
            getStr(o, {
                name: "duration",
                description: `How long? (ex: 5s, 10s, 1m, ...etc)`,
                required: false,
            }),
        )
        .addChannelOption((o) =>
            o
                .setName("channel")
                .setDescription(`Which channel?`)
                .setRequired(false)
                .addChannelTypes(
                    ChannelType.AnnouncementThread,
                    ChannelType.GuildText,
                    ChannelType.GuildVoice,
                    ChannelType.PrivateThread,
                    ChannelType.PublicThread,
                    ChannelType.GuildStageVoice,
                ),
        ),
    locked: {
        roles: [roles.moderator, roles.moderator, ...roles.main],
    },
    defer: { silent: true },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const channel =
            i.options.getChannel("channel", false, channelTypes) || i.channel;
        if (!("rateLimitPerUser" in channel)) {
            return r.edit(
                embedComment(`Channel provided doesn't support slowmode?`),
            );
        }
        const duration = i.options.getString("duration", false) || null;
        if (is.null(duration)) {
            if (!channel.rateLimitPerUser) {
                return r.edit(
                    embedComment(
                        `${channel.toString()} doesn't have a slowmode set.`,
                    ),
                );
            }
            return channel
                .edit({
                    rateLimitPerUser: 0,
                    reason: `Slowmode turned off by: @${i.user.username} (${i.user.id})`,
                })
                .then(() => {
                    return r.edit(
                        embedComment(
                            `Slowmode has been turned off for ${channel.toString()}`,
                            "Green",
                        ),
                    );
                })
                .catch((err) => {
                    error(
                        `Unable to remove the slowmode for ${channel.name} (${channel.id})`,
                        err,
                    );
                    return r.edit(
                        embedComment(
                            `Unable to remove the slowmode for the channel, try again later?`,
                        ),
                    );
                });
        }
        if (!Duration.validate(duration)) {
            return r.edit(
                embedComment(`The custom duration (${duration}) isn't valid.`),
            );
        }
        let time = Duration.parse(duration);
        if (!is.number(time)) {
            return r.edit(
                embedComment(`Unable to parse the duration provided.`),
            );
        }
        if (time > 2332800000) {
            time = 2332800000;
        }
        let slowmode = Math.floor(time / 1000);
        if (isNaN(slowmode) || slowmode < 0) {
            slowmode = 0;
        }
        if (slowmode > 21600) {
            return r.edit(embedComment(`The max slowmode is 6 hours (21600)`));
        }
        const format = ms.get(time, true);
        return channel
            .edit({
                rateLimitPerUser: slowmode,
                reason: `Added slowmode by: @${i.user.username} (${i.user.id})`,
            })
            .then(() =>
                r.edit(
                    embedComment(
                        `I've set slowmode for ${channel.toString()} to ${format}`,
                        "Green",
                    ),
                ),
            )
            .catch((err) => {
                error(
                    `Unable to set the slowmode in #${channel.name} (${channel.id}) by: ${i.user.tag} (${i.user.id})`,
                    err,
                );
                return r.edit(
                    embedComment(
                        `Unable to set the slowmode for ${channel.toString()}`,
                    ),
                );
            });
    },
});
