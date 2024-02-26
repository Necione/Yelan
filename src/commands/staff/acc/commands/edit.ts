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
    log,
} from "@elara-services/utils";
import type { UserWallet } from "@prisma/client";
import { Colors, EmbedBuilder } from "discord.js";
import { roles } from "../../../../config";
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
    async execute(i) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const user = i.options.getUser("user", true);
        const type = i.options.getString("type", true) as ValidTypes;
        const amount = i.options.getInteger("amount", true);
        if (!valid.includes(type)) {
            return i
                .editReply(embedComment(`You provided an invalid type.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        if (user.bot) {
            return i
                .editReply(embedComment(`Bots don't have a user profile.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const p = await getProfileByUserId(user.id);
        if (!p) {
            return i
                .editReply(embedComment(`Unable to find the user's profile.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const data = await getProfileByUserId(user.id);
        if (!data) {
            return i
                .editReply(
                    embedComment(
                        `Unable to find ${user.toString()}'s profile.`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        if (data[type] === amount) {
            return i
                .editReply(
                    embedComment(
                        `${user.toString()}'s (\`${type}\`) is already set to that!`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
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

        return prompt
            .editReply(
                embedComment(
                    `✅ I've updated ${user.toString()} (${
                        user.id
                    })'s (\`${type}\`) to ${formatNumber(amount)}!`,
                    "Green",
                ),
            )
            .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
    },
});
