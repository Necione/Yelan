import {
    buildCommand,
    getInt,
    getStr,
    getUser,
} from "@elara-services/botbuilder";
import {
    embedComment,
    formatNumber,
    get,
    getConfirmPrompt,
} from "@elara-services/utils";
import type { UserWallet } from "@prisma/client";
import { Colors, EmbedBuilder } from "discord.js";
import { devId, roles } from "../../../../config";
import { getProfileByUserId, updateUserProfile } from "../../../../services";
import { logs } from "../../../../utils";

type ValidTypes = keyof UserWallet;

const valid: ValidTypes[] = [
    "balance",
    "balanceAdded",
    "balanceRemove",
    "dailyLimit",
    "daily",
    "lemon",
    "messagesSent",
    "staffCredits",
    "triviaPoints",
    "vault",
    "elo",
];

export const edit = buildCommand({
    subCommand: (b) =>
        b
            .setName(`edit`)
            .setDescription(`Edit a certain field for a user's profile`)
            .addUserOption((o) => getUser(o))
            .addStringOption((o) =>
                getStr(o, {
                    name: `type`,
                    description: `Which type?`,
                    required: true,
                    choices: valid.map((c) => ({ name: c, value: c })),
                }),
            )
            .addIntegerOption((o) =>
                getInt(o, {
                    name: "amount",
                    description: `What's the amount you want to set?`,
                    min: 0,
                    max: 999999999999999,
                    required: true,
                }),
            ),
    locked: { roles: roles.main },
    defer: { silent: true },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const user = i.options.getUser("user", true);
        if (i.user.id !== devId && user.id === devId) {
            return r.edit(embedComment(`Respectfully, fuck off.`));
        }
        const type = i.options.getString("type", true) as ValidTypes;
        const amount = i.options.getInteger("amount", true);
        if (!valid.includes(type)) {
            return r.edit(embedComment(`You provided an invalid type.`));
        }
        if (user.bot) {
            return r.edit(embedComment(`Bots don't have a user profile.`));
        }
        const p = await getProfileByUserId(user.id);
        if (!p) {
            return r.edit(embedComment(`Unable to find the user's profile.`));
        }
        const data = await getProfileByUserId(user.id);
        if (!data) {
            return r.edit(
                embedComment(`Unable to find ${user.toString()}'s profile.`),
            );
        }
        if (data[type] === amount) {
            return r.edit(
                embedComment(
                    `${user.toString()}'s (\`${type}\`) is already set to that!`,
                ),
            );
        }

        const prompt = await getConfirmPrompt(
            i,
            i.user,
            `Are you sure you want to set their (${type}) to ${formatNumber(
                amount,
            )} from ${formatNumber(data[type] as number)}?`,
            get.secs(10),
        );
        if (!prompt) {
            return;
        }
        await updateUserProfile(user.id, {
            [type]: { set: amount },
        });

        await logs.misc({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({
                        name: `@${user.username} (${user.id})`,
                        iconURL: user.displayAvatarURL(),
                    })
                    .setTitle(`Data Edited`)
                    .setColor(Colors.Yellow)
                    .addFields({
                        name: `${type}`,
                        value: `${formatNumber(amount)}`,
                    })
                    .setFooter({
                        text: `By: @${i.user.username} (${i.user.id})`,
                        iconURL: i.user.displayAvatarURL(),
                    }),
            ],
        });

        return r.edit(
            embedComment(
                `✅ I've updated ${user.toString()} (${
                    user.id
                })'s (\`${type}\`) to ${formatNumber(amount)}!`,
                "Green",
            ),
        );
    },
});
