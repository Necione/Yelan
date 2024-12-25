import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, noop } from "@elara-services/utils";
import { SlashCommandBuilder, type Message } from "discord.js";
import { channels, roles } from "../../config";

export const qotd = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("qotd")
        .setDescription("Post the question of the day")
        .setDMPermission(false)
        .addStringOption((o) =>
            o
                .setName(`question`)
                .setDescription(`What's the question for today?`)
                .setRequired(true),
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("What user made this question?")
                .setRequired(true),
        )
        .addIntegerOption((o) =>
            o
                .setName(`num`)
                .setDescription(`What's the number for this question?`)
                .setRequired(true),
        ),
    defer: { silent: true },
    locked: {
        roles: [...roles.main, roles.moderator],
    },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const question = i.options.getString("question", true);
        const user = i.options.getUser("user", true);
        const num = i.options.getInteger("num", true);
        const channel = i.guild.channels.resolve(channels.qotd);
        if (!channel || !channel.isTextBased()) {
            return r.edit(embedComment(`Unable to find the QOTD channel.`));
        }
        const message: Message<true> | Error = await channel
            .send({
                content: roles.qotd && `<@&${roles.qotd}>`,
                embeds: [
                    {
                        author: {
                            name: `Daily Question #${num}`,
                        },
                        color: 0x7a9bff,
                        description: `## **${question}**\n> Answer the question in the thread below\n\nSuggestions: <#1177883495687782481>\nTurn on/off pings: <id:customize>`,
                        footer: {
                            text: `Given by: ${user.username}`,
                            icon_url: user.displayAvatarURL(),
                        },
                    },
                ],
            })
            .catch((e) => e);
        if (is.error(message)) {
            return r.edit(embedComment(message.message));
        }
        await message.crosspost().catch(noop);
        await message
            .startThread({
                name: `Daily Question #${num}`,
                reason: `Created for QOTD`,
            })
            .catch(noop);
        return r.edit(
            embedComment(
                `Daily question posted!\n> [View](${message.url})`,
                "Green",
            ),
        );
    },
});
