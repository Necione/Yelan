import { buildCommand, getUser } from "@elara-services/botbuilder";
import {
    discord,
    embedComment,
    get,
    getConfirmPrompt,
    noop,
    proper,
} from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { isDev, roles } from "../../../../config";
import { getProfileByUserId, updateUserProfile } from "../../../../services";
import { highRollerRequirement } from "../../../coins/stats";

export const perks = buildCommand({
    subCommand: (b) =>
        b
            .setName(`perks`)
            .setDescription(`Manage perks for users`)
            .addUserOption((o) => getUser(o))
            .addStringOption((o) =>
                o
                    .setName(`perk`)
                    .setDescription(`Which perk?`)
                    .setRequired(true)
                    .addChoices(
                        ["high_roller"].map((c) => ({
                            name: proper(c),
                            value: c,
                        })),
                    ),
            ),
    locked: {
        roles: [...roles.main, roles.headmod],
    },
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const user = i.options.getUser("user", true);
        const perk = i.options.getString("perk", true);
        if (!perk) {
            return r.edit(embedComment(`No perk provided?`));
        }
        if (user.bot) {
            return r.edit(embedComment(`Bots don't have a profile.`));
        }
        if (!isDev(i.user.id)) {
            if (i.user.id === user.id) {
                return r.edit(embedComment(`You can't manage yourself.`));
            }
        }
        const member = await discord.member(i.guild, user.id, true, true);
        if (!member) {
            return r.edit(
                embedComment(`Unable to find the member in this server.`),
            );
        }
        const p = await getProfileByUserId(user.id);
        if (!p) {
            return r.edit(embedComment(`Unable to find their user profile.`));
        }
        if (p.locked) {
            return r.edit(
                embedComment(`User ${user.toString()}'s profile is locked.`),
            );
        }
        switch (perk.toLowerCase()) {
            case "high_roller": {
                const wagered = Math.floor(
                    (p.balanceAdded || 0) + (p.balanceRemove || 0),
                );
                if (wagered < highRollerRequirement) {
                    return r.edit(
                        embedComment(
                            `User ${user.toString()} doesn't meet the requirements for the \`High Roller\` perk.`,
                        ),
                    );
                }

                const role =
                    member.guild.roles.resolve(`1157951644978393098`) ||
                    member.guild.roles.cache.find((c) =>
                        c.name.toLowerCase().includes("high roller"),
                    );
                if (!role || !role.editable) {
                    return r.edit(
                        embedComment(
                            `Unable to find the \`High Roller\` role or I can't add anyone to it.`,
                        ),
                    );
                }
                if (member.roles.cache.has(role.id)) {
                    const c = await getConfirmPrompt(
                        i,
                        i.user,
                        `Do you want to remove ${user.toString()}'s \`High Roller\` perk?`,
                        get.secs(10),
                    );
                    if (!c) {
                        return r.edit(
                            embedComment(`You didn't want to remove the perk.`),
                        );
                    }
                    await member.roles
                        .remove(
                            role.id,
                            `${i.user.tag} (${i.user.id}) removed the High Roller perk.`,
                        )
                        .catch(noop);
                    await updateUserProfile(user.id, {
                        dailyLimit: { set: 150_000 },
                    });
                    await i.client.dms.user(
                        user.id,
                        embedComment(
                            `You've been removed from the \`High Roller\` role and the daily limit increase was reduced to 150k`,
                        ),
                    );
                    return r.edit(
                        embedComment(
                            `${
                                customEmoji.a.z_check
                            } Removed \`High Roller\` perks from ${user.toString()}`,
                            "Green",
                        ),
                    );
                }
                await member.roles
                    .add(role.id, `Achieved High Roller status`)
                    .catch(noop);
                await updateUserProfile(user.id, {
                    dailyLimit: { set: 999_999_999 },
                });
                await i.client.dms.user(
                    user.id,
                    embedComment(
                        `Congrats, you've been granted the \`High Roller\` perk.\n-# The role and daily limit increase were given.`,
                        "Green",
                    ),
                );
                return r.edit(
                    embedComment(
                        `${
                            customEmoji.a.z_check
                        } Granted \`High Roller\` perks to ${user.toString()}`,
                        "Green",
                    ),
                );
            }
        }
    },
});
