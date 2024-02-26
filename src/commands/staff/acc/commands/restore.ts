import { buildCommand, getStr, getUser } from "@elara-services/botbuilder";
import { fetch } from "@elara-services/packages";
import {
    embedComment,
    get,
    getConfirmPrompt,
    is,
    log,
    time,
} from "@elara-services/utils";
import type { UserWallet } from "@prisma/client";
import { Message } from "discord.js";
import { roles } from "../../../../config";
import { prisma } from "../../../../prisma";

export type Response = Omit<UserWallet, "id"> & { id?: string };
export const restore = buildCommand({
    subCommand: (b) =>
        b
            .setName(`restore`)
            .setDescription(`Restore a user's profile.`)
            .addUserOption((o) => getUser(o))
            .addStringOption((o) =>
                getStr(o, {
                    name: "message_url",
                    description: `What's the message URL?`,
                    required: true,
                }),
            ),
    locked: { roles: roles.main },
    async execute(i) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const user = i.options.getUser("user", true);
        const messageURL = i.options.getString("message_url", true);
        if (user.bot) {
            return i
                .editReply(embedComment(`Bots don't have a profile.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        if (!messageURL.match(/\/channels\//gi)) {
            return i
                .editReply(
                    embedComment(`You didn't provide a valid message link`),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const s = messageURL.split(/\/channels\//gi)[1];
        if (!is.string(s)) {
            return i
                .editReply(embedComment(`Unable to parse the link`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const [guildId, channelId, messageId] = s.split("/");
        const guild = i.client.guilds.resolve(guildId);
        if (!guild || !guild.available) {
            return i
                .editReply(
                    embedComment(
                        `Unable to find the server that message belongs to.`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const channel = guild.channels.resolve(channelId);
        if (!channel || !("messages" in channel)) {
            return i
                .editReply(
                    embedComment(
                        `Unable to find the channel that message belongs to.`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const message = await channel.messages.fetch(messageId).catch((e) => e);
        if (!(message instanceof Message)) {
            return i
                .editReply(
                    embedComment(
                        `Unable to fetch the message info: ${message}`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const attachment = message.attachments.find((c) =>
            c.name.endsWith(".json"),
        );
        if (!attachment) {
            return i
                .editReply(
                    embedComment(`Unable to find the file in the channel.`),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const data = await fetch<
            object,
            UserWallet | { users: string[]; profiles: UserWallet[] } | null
        >(attachment.url);
        if (!data) {
            return i
                .editReply(embedComment(`Unable to fetch the file's data.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        let obj: Response; // don't judge this, TS is just stupid.
        if ("profiles" in data) {
            const find = data.profiles.find((c) => c.userId === user.id);
            if (!find) {
                return i
                    .editReply(
                        embedComment(
                            `Unable to find ${user.toString()} user in the 'profiles' array.`,
                        ),
                    )
                    .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
            }
            obj = find;
        } else {
            obj = new Object(data) as Response;
        }
        if (!obj) {
            return i
                .editReply(
                    embedComment(
                        `Unable to find any data to restore for that user.`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const col = await getConfirmPrompt(
            i,
            i.user,
            `Are you sure you want to restore ${user.toString()}'s profile to the link you provided?\n> This will completely remove their current data.`,
            get.secs(30),
        );
        if (!col) {
            return;
        }
        delete obj.id;
        await prisma.userWallet
            .upsert({
                where: {
                    userId: obj.userId,
                },
                create: obj,
                update: obj,
            })
            .catch(() => null);
        await message
            .reply(
                embedComment(
                    `[${time.short.time(
                        new Date(),
                    )}]: Profile restored by: \`@${i.user.username}\` (${
                        i.user.id
                    })`,
                    "Yellow",
                ),
            )
            .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        return i
            .editReply(
                embedComment(
                    `Restored <@${obj.userId}>'s profile to the file data you provided.`,
                    "Green",
                ),
            )
            .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
    },
});
