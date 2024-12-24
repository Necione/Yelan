import {
    buildCommand,
    getStr,
    getUser,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { getUsersFromString, make } from "@elara-services/utils";
import { Colors, SlashCommandBuilder, type User } from "discord.js";
import { roles } from "../../config";

export const dm = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`dm`)
        .setDescription(`DM one or multiple users with the message`)
        .setDMPermission(false)
        .addUserOption((o) => getUser(o))
        .addStringOption((o) =>
            getStr(o, {
                name: "message",
                description: `What's the message?`,
                required: true,
                min: 1,
                max: 2000,
            }),
        )
        .addStringOption((o) =>
            getStr(o, {
                name: "other_users",
                description: `What other users? (provide mention/ids, put a space between them)`,
                required: false,
            }),
        ),
    defer: { silent: true },
    locked: { roles: [...roles.main, roles.management.econ] },
    async execute(i, r) {
        const user = i.options.getUser("user", true);
        const message = i.options.getString("message", true);
        const other = i.options.getString("other_users", false);
        const users = make.array<User>([user]);
        if (other) {
            const us = await getUsersFromString(i.client, other);
            if (us.size) {
                users.push(...us.values());
            }
        }
        const res = await i.client.dms.users(
            users.map((c) => c.id),
            { content: message },
        );

        return r.edit({
            embeds: [
                {
                    color: Colors.Aqua,
                    timestamp: new Date().toISOString(),
                    title: `DMs`,
                    description: res
                        .map(
                            (c) =>
                                `\`${c.status ? "🟢" : "🔴"} ${
                                    users.find((u) => u.id === c.options.userId)
                                        ?.username || "Unknown User??"
                                }\``,
                        )
                        .join("\n"),
                },
            ],
        });
    },
});
