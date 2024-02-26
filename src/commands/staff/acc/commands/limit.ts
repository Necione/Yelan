import { buildCommand, getInt, getUser } from "@elara-services/botbuilder";
import { embedComment, formatNumber, is, log } from "@elara-services/utils";
import { roles } from "../../../../config";
import { getProfileByUserId, updateUserProfile } from "../../../../services";

export const limit = buildCommand({
    subCommand: (b) =>
        b
            .setName(`limit`)
            .setDescription(`Set the daily limit for a user`)
            .addUserOption((o) => getUser(o))
            .addIntegerOption((o) =>
                getInt(o, {
                    name: `amount`,
                    min: 1,
                    max: Number.MAX_SAFE_INTEGER,
                }),
            ),
    locked: { roles: roles.main },
    async execute(i) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const user = i.options.getUser("user", true);
        const amount = i.options.getInteger("amount", true);
        if (!is.number(amount)) {
            return i
                .editReply(embedComment(`You provided an invalid amount.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
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
        await updateUserProfile(user.id, { dailyLimit: { set: amount } });
        return i
            .editReply(
                embedComment(
                    `I've set ${user.toString()}'s daily limit to: ${formatNumber(
                        amount,
                    )}`,
                    "Green",
                ),
            )
            .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
    },
});
