import { buildCommand, getBool, getUser } from "@elara-services/botbuilder";
import {
    discord,
    embedComment,
    get,
    getConfirmPrompt,
    is,
    make,
    noop,
} from "@elara-services/utils";
import { mainServerId, roles } from "../../../../config";
import { prisma } from "../../../../prisma";
import { getProfileByUserId } from "../../../../services";
import { levels } from "../../../../services/levels";
import { logs } from "../../../../utils";
import type { Response } from "./restore";

export const transfer = buildCommand({
    subCommand: (b) =>
        b
            .setName(`transfer`)
            .setDescription(
                `Transfer a user's old profile to their new account`,
            )
            .addUserOption((o) =>
                getUser(o, {
                    name: "old_user",
                    description: `What's their old Discord account?`,
                }),
            )
            .addUserOption((o) =>
                getUser(o, {
                    name: "user",
                    description: `What's their new account?`,
                }),
            )
            .addBooleanOption((o) =>
                getBool(o, {
                    name: "include_roles",
                    required: true,
                    description: `Should I transfer their roles as well? (Removes roles from the old account as well)`,
                }),
            ),
    locked: { roles: roles.main },
    defer: { silent: true },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        levels.client = i.client;
        const oldUser = i.options.getUser("old_user", true);
        const user = i.options.getUser("user", true);
        const includeRoles = i.options.getBoolean("include_roles", true);
        if (oldUser.bot || user.bot) {
            return r.edit(
                embedComment(`One of the users you provided is a bot account.`),
            );
        }
        const mainGuild =
            i.client.guilds.resolve(mainServerId) ||
            (await i.client.guilds.fetch(mainServerId).catch(noop));
        if (!mainGuild) {
            return r.edit(
                embedComment(`Unable to find the main server's data.`),
            );
        }
        const oldMember = await discord.member(
            mainGuild,
            oldUser.id,
            true,
            false,
        );
        const newMember = await discord.member(mainGuild, user.id, true, false);
        const op = (await getProfileByUserId(oldUser.id)) as Response;
        if (!op) {
            return r.edit(
                embedComment(`Unable to find their old account data`),
            );
        }
        const leveling = await levels.api.users.get(user.id, mainServerId);
        const col = await getConfirmPrompt(
            i,
            i.user,
            `Are you 100% sure you want to transfer the profile data from ${oldUser.toString()}'s (${
                oldUser.id
            }) to ${user.toString()} (${
                user.id
            })?\n> The old account's data will be deleted from the system as well.`,
            get.secs(10),
        );
        if (!col) {
            return;
        }
        if (!col.deferred) {
            await col.deferUpdate().catch(noop);
        }
        if (oldMember && newMember && includeRoles) {
            const list = make.array<string>();
            for (const role of oldMember.roles.cache.values()) {
                if (
                    newMember.roles.cache.has(role.id) ||
                    role.id === mainGuild.id ||
                    role.id === i.guildId
                ) {
                    continue;
                }
                list.push(role.id);
            }
            if (is.array(list)) {
                await newMember.roles.add(list).catch(noop);
            }
            await oldMember.roles
                .remove(
                    oldMember.roles.cache.filter(
                        (c) => c.id !== i.guildId || c.id !== roles.general,
                    ),
                )
                .catch(noop);
        }
        const msg = await logs.backup({
            content: `> \`${i.user.displayName}\` (${
                i.user.id
            }) transferred profile data from ${oldUser.toString()} (${
                oldUser.id
            }) to ${user.toString()} (${user.id})`,
            allowedMentions: { parse: [] },
            files: [
                {
                    name: `${oldUser.id}.json`,
                    attachment: Buffer.from(JSON.stringify(op, undefined, 2)),
                },
                {
                    name: `${oldUser.id}_levels.json`,
                    attachment: Buffer.from(
                        JSON.stringify(
                            leveling.status ? leveling.data : {},
                            undefined,
                            2,
                        ),
                    ),
                },
            ],
        });
        if (!msg) {
            return r.edit(
                embedComment(
                    `Unable to transfer the user's profile data, notify the developer(s) about this issue.`,
                ),
            );
        }
        delete op.id;
        op.userId = user.id;
        await Promise.all([
            prisma.userWallet
                .upsert({
                    where: {
                        userId: user.id,
                    },
                    create: op,
                    update: op,
                })
                .catch(noop),
            prisma.userWallet
                .delete({
                    where: {
                        userId: oldUser.id,
                    },
                })
                .catch(noop),
            levels.api.users.delete.guild(user.id, i.guildId),
        ]);

        return r.edit(
            embedComment(
                `I've transferred all data from ${oldUser.toString()} (${
                    oldUser.id
                }) to ${user.toString()} (${
                    user.id
                })\n> Note: The old account profile data is now deleted.`,
                "Green",
            ),
        );
    },
});
