import {
    buildCommand,
    getStr,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { embedComment, error, is, log } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { roles } from "../../config";
import { logs } from "../../utils";

export const rename = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`rename`)
        .setDescription(`[STAFF]: Rename a channel.`)
        .setDMPermission(false)
        .addStringOption((o) =>
            getStr(o, {
                name: "name",
                description: `What's the new channel name?`,
                required: true,
            }),
        ),
    locked: {
        roles: [roles.staff, ...roles.main, "1090489193454633090"],
    },
    defer: { silent: true },
    async execute(i) {
        if (!i.inCachedGuild()) {
            return;
        }
        const newName = i.options.getString("name");

        if (!is.string(newName)) {
            return i
                .editReply(embedComment("Please provide a valid channel name."))
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }

        if (!i.channel || !i.member || !i.channel.manageable) {
            return i
                .editReply(embedComment("I cannot rename this channel."))
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }
        const before = `${i.channel.name.toString()}`;
        const rr = await i.channel
            .edit({
                name: newName,
                reason: `Renamed by: @${i.user.username} (${i.user.id})`,
            })
            .catch((e) => e);
        if (is.error(rr)) {
            error(rr);
            return i
                .editReply(
                    embedComment(
                        "An error occurred while renaming the channel.",
                    ),
                )
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }
        await logs.misc({
            embeds: embedComment(
                `${i.user.toString()} (${
                    i.user.id
                }) has renamed ${i.channel.toString()} (\`${
                    i.channelId
                }\`)\nBefore: \`\`\`txt\n${before}\`\`\`\nAfter:\n\`\`\`txt\n${newName}\`\`\``,
                "Orange",
            ).embeds,
        });

        return i
            .editReply(embedComment(`Channel renamed to ${newName}.`, "Green"))
            .catch((e) => log(`[${this.command.name}]: ERROR`, e));
    },
});
