import { buildCommand, getStr, getUser } from "@elara-services/botbuilder";
import {
    embedComment,
    get,
    getConfirmPrompt,
    log,
} from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { roles } from "../../../../config";
import { getProfileByUserId, updateUserProfile } from "../../../../services";
import { cooldowns } from "../../../../utils";

const choices = [
    "elo",
    "daily",
    "backgroundUrl",
    "rankedUID",
    "vault",
    "balance",
    "messagesSent",
    "staffCredits",
    "lemon",
    "claimed",
    "achievements",
    "balanceAdded",
    "balanceRemove",
    "collectables",
    "badges",
    "rakeback",
];
const ints = [
    "elo",
    "daily",
    "vault",
    "balance",
    "messagesSent",
    "staffCredits",
    "balanceAdded",
    "balanceRemove",
    "lemon",
    "claimed",
    "rankedUID",
];
const arrays = ["achievements", "collectables", "badges"];
const texts = ["backgroundUrl"];

export const reset = buildCommand({
    subCommand: (b) =>
        b
            .setName(`reset`)
            .setDescription(`Reset a certain field for a user's profile`)
            .addUserOption((o) => getUser(o))
            .addStringOption((o) =>
                getStr(o, {
                    name: `type`,
                    description: `Which type?`,
                    required: true,
                    choices: choices.map((c) => ({ name: c, value: c })),
                }),
            ),
    locked: { roles: roles.main },
    async execute(i) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const user = i.options.getUser("user", true);
        const type = i.options.getString("type", true);
        if (!choices.includes(type)) {
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
        let str = "";
        let data: Prisma.UserWalletUpdateInput = {};
        if (ints.includes(type)) {
            data = { [type]: { set: 0 } };
            if (type === "rankedUID") {
                data["rankedRegion"] = 0;
            }
            str = "amount to 0";
        }
        if (arrays.includes(type)) {
            data = { [type]: { set: [] } };
            str = "to an empty array.";
        }
        if (texts.includes(type)) {
            data = { [type]: { set: "" } };
            str = "to an empty string.";
        }
        if (type === "rakeback") {
            data = { rakeback: { amount: 0, claimed: 0 } };
            str = "rakeback amount and claim timer is now 0";
        }
        if (type === "daily") {
            await cooldowns.set(p, "daily", 0);
            str = "daily cooldown";
        } //for testing the daily check-in
        const col = await getConfirmPrompt(
            i,
            i.user,
            `Are you 100% sure you want to reset ${user.toString()}'s (${type}) data?`,
            get.secs(10),
        );
        if (!col) {
            return;
        }
        await updateUserProfile(user.id, data);
        return i
            .editReply(
                embedComment(
                    `I've reset ${user.toString()}'s (${type}) ${str}`,
                    "Green",
                ),
            )
            .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
    },
});
