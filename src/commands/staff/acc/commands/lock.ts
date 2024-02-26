import {
    buildCommand,
    getBool,
    getReason,
    getUser,
} from "@elara-services/botbuilder";
import { embedComment, is, log, proper } from "@elara-services/utils";
import { EmbedBuilder } from "discord.js";
import { roles } from "../../../../config";
import { getProfileByUserId, updateUserProfile } from "../../../../services";
import { logs } from "../../../../utils";

export const lock = buildCommand({
    subCommand: (b) =>
        b
            .setName(`lock`)
            .setDescription(`Lock a user's profile`)
            .addUserOption((o) => getUser(o))
            .addStringOption((o) => getReason(o))
            .addBooleanOption((o) =>
                getBool(o, {
                    name: "dm",
                    description: `Do you want me to DM them? (Default: True)`,
                }),
            ),
    locked: { roles: roles.main },
    async execute(i) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const user = i.options.getUser("user", true);
        const reason =
            i.options.getString("reason", false) || "No Reason Provided";
        let shouldDM = i.options.getBoolean("dm", false);
        if (!is.boolean(shouldDM)) {
            shouldDM = true;
        }
        if (user.bot) {
            return i
                .editReply(embedComment(`Bots don't have a profile.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const p = await getProfileByUserId(user.id);
        if (!p) {
            return i
                .editReply(embedComment(`Unable to find their user profile.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const type = p.locked ? false : true;
        if (shouldDM) {
            await user
                .send(
                    embedComment(
                        `You're user profile has been ${
                            type ? "" : "un"
                        }locked.${
                            reason.length ? `\n\n### Reason: ${reason}` : ""
                        }`,
                        type ? "Red" : "Green",
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        await Promise.all([
            logs.misc({
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({
                            name: `@${user.username} (${user.id})`,
                            iconURL: user.displayAvatarURL(),
                        })
                        .setTitle(
                            `Account ${proper(type ? "locked" : "unlocked")}`,
                        )
                        .setColor(type ? "Red" : "Green")
                        .addFields({ name: "Reason", value: reason })
                        .setFooter({
                            text: `By: @${i.user.username} (${i.user.id})`,
                            iconURL: i.user.displayAvatarURL(),
                        }),
                ],
            }),
            updateUserProfile(user.id, { locked: type }),
        ]);
        return i
            .editReply(
                embedComment(
                    type
                        ? `${user.toString()}'s account is now locked.`
                        : `${user.toString()}'s account is now unlocked.`,
                    type ? "Red" : "Green",
                ),
            )
            .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
    },
});
