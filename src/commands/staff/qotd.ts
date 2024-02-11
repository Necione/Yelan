import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, log } from "@elara-services/utils";
import { SlashCommandBuilder, type Message } from "discord.js";
import { channels, roles } from "../../config";
import { images } from "../../utils/images";

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
        roles: [...roles.main, roles.headmod],
    },
    async execute(i) {
        if (!i.inCachedGuild()) {
            return;
        }
        const question = i.options.getString("question", true);
        const user = i.options.getUser("user", true);
        const num = i.options.getInteger("num", true);
        const channel = i.guild.channels.resolve(channels.qotd);
        if (!channel || !channel.isTextBased()) {
            return i
                .editReply(embedComment(`Unable to find the QOTD channel.`))
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }
        const message: Message<true> | Error = await channel
            .send({
                content: roles.qotd && `<@&${roles.qotd}>`,
                embeds: [
                    {
                        author: {
                            name: `Daily Question #${num}`,
                            icon_url: images.commands.qotd.author,
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
            return i
                .editReply(embedComment(message.message))
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }
        await message.crosspost().catch(() => null);
        await message
            .startThread({
                name: `Daily Question #${num}`,
                reason: `Created for QOTD`,
            })
            .catch(() => null);
        return i
            .editReply(
                embedComment(
                    `Daily question posted!\n> [View](${message.url})`,
                    "Green",
                ),
            )
            .catch((e) => log(`[${this.command.name}]: ERROR`, e));
    },
});
