import { buildCommand } from "@elara-services/botbuilder";
import {
    embedComment,
    get,
    getConfirmPrompt,
    log,
} from "@elara-services/utils";
import { mainServerId, roles } from "../../../../config";
import { prisma } from "../../../../prisma";
import { getProfileByUserId } from "../../../../services";
import { levels } from "../../../../services/levels";
import { getUser, logs } from "../../../../utils";
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
            ),
    locked: { roles: roles.main },
    async execute(i) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        levels.client = i.client;
        const oldUser = i.options.getUser("old_user", true);
        const user = i.options.getUser("user", true);
        if (oldUser.bot || user.bot) {
            return i
                .editReply(
                    embedComment(
                        `One of the users you provided is a bot account.`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const op = (await getProfileByUserId(oldUser.id)) as Response;
        if (!op) {
            return i
                .editReply(
                    embedComment(`Unable to find their old account data`),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
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
            await col
                .deferUpdate()
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
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
            return i
                .editReply(
                    embedComment(
                        `Unable to transfer the user's profile data, notify the developer(s) about this issue.`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
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
                .catch(() => null),
            prisma.userWallet
                .delete({
                    where: {
                        userId: oldUser.id,
                    },
                })
                .catch(() => null),
            levels.api.users.delete.guild(user.id, i.guildId),
        ]);

        return i
            .editReply(
                embedComment(
                    `I've transferred all data from ${oldUser.toString()} (${
                        oldUser.id
                    }) to ${user.toString()} (${
                        user.id
                    })\n> Note: The old account profile data is now deleted.`,
                    "Green",
                ),
            )
            .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
    },
});
