import {
    buildCommand,
    getStr,
    getUser,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { discord, noop } from "@elara-services/utils";
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
        const users = new Set<User>([user]);
        if (other) {
            const ids = other.split(" ");
            for await (const id of ids) {
                const u = await discord.user(i.client, id, {
                    fetch: true,
                    mock: false,
                });
                if (u && !u.bot) {
                    users.add(u);
                }
            }
        }
        const description = [];
        for await (const user of users.values()) {
            const dm = await user.send({ content: message }).catch(noop);
            description.push(`\`${dm ? "🟢" : "🔴"} ${user.username}\``);
        }

        return r.edit({
            embeds: [
                {
                    color: Colors.Aqua,
                    timestamp: new Date().toISOString(),
                    title: `DMs`,
                    description: description.join("\n"),
                },
            ],
        });
    },
});
