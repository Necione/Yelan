import {
    buildCommand,
    getStr,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { embedComment, error, is } from "@elara-services/utils";
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
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const newName = i.options.getString("name");

        if (!is.string(newName)) {
            return r.edit(embedComment("Please provide a valid channel name."));
        }

        if (!i.channel || !i.member || !i.channel.manageable) {
            return r.edit(embedComment("I cannot rename this channel."));
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
            return r.edit(
                embedComment("An error occurred while renaming the channel."),
            );
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

        return r.edit(embedComment(`Channel renamed to ${newName}.`, "Green"));
    },
});
