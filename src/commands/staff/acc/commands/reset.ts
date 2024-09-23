import { buildCommand, getStr, getUser } from "@elara-services/botbuilder";
import {
    embedComment,
    get,
    getConfirmPrompt,
    getKeys,
} from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { roles } from "../../../../config";
import {
    getProfileByUserId,
    updateUserProfile,
    updateUserStats,
} from "../../../../services";
import { cooldowns } from "../../../../utils";

const choices = [
    "hunting",
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
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const user = i.options.getUser("user", true);
        const type = i.options.getString("type", true);
        if (!choices.includes(type)) {
            return r.edit(embedComment(`You provided an invalid type.`));
        }
        if (user.bot) {
            return r.edit(embedComment(`Bots don't have a user profile.`));
        }
        const p = await getProfileByUserId(user.id);
        if (!p) {
            return r.edit(embedComment(`Unable to find the user's profile.`));
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
        if (type === "hunting") {
            str = `hunting cooldown & isHunting`;
        }
        if (type === "daily") {
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
        if (type === "hunting") {
            await cooldowns.del(p, "hunt");
            await updateUserStats(p.userId, { isHunting: { set: false } });
        }
        if (type === "daily") {
            await cooldowns.del(p, "daily");
        }
        if (getKeys(data).length) {
            await updateUserProfile(user.id, data);
        }
        return r.edit(
            embedComment(
                `I've reset ${user.toString()}'s (${type}) ${str}`,
                "Green",
            ),
        );
    },
});
