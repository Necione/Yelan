import {
    buildCommand,
    getBool,
    getStr,
    getUser,
    type SlashCommand,
} from "@elara-services/botbuilder";
import {
    chunk,
    embedComment,
    formatNumber,
    is,
    noop,
    proper,
    time,
} from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { devId, roles } from "../../config";
import {
    getProfileByUserId,
    removeStrike,
    updateUserProfile,
} from "../../services";
import { getPaginatedMessage } from "../../utils";

export const strikes = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`strikes`)
        .setDescription(`Check your own strikes`)
        .setDMPermission(false)
        .addUserOption((o) =>
            getUser(o, {
                name: "user",
                description: "[STAFF]: What user do you want to check?",
                required: false,
            }),
        )
        .addStringOption((o) =>
            getStr(o, {
                name: "id",
                description: `[ADMIN]: A strike ID to view/remove from the user.`,
                required: false,
            }),
        )
        .addBooleanOption((o) =>
            getBool(o, {
                name: "remove",
                description: `[ADMIN]: Remove the strike from the user`,
                required: false,
            }),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        let user = i.user;
        const u = i.options.getUser("user", false);
        const id = i.options.getString("id", false);
        const remove = i.options.getBoolean("remove", false) || false;
        if (
            i.member.roles.cache.hasAny(...[...roles.main, roles.moderator]) &&
            u
        ) {
            user = u;
        }
        if (i.user.id !== devId && user.id === devId) {
            return r.edit(embedComment(`Respectfully, fuck off.`));
        }
        const term = i.user.id === user.id ? "your" : "their";
        if (user.bot) {
            return r.edit(embedComment(`Bots can't have strikes...`));
        }

        const p = await getProfileByUserId(user.id);
        if (!p) {
            return r.edit(embedComment(`No user profile found.`));
        }
        if (!is.array(p.strike)) {
            p.strike = [];
            await updateUserProfile(p.userId, { strike: { set: [] } });
        }
        if (i.member.roles.cache.hasAny(...roles.main)) {
            if (is.string(id)) {
                const f = p.strike.find((r) => r.id === id);
                if (!f) {
                    return r.edit(
                        embedComment(`Strike (\`${id}\`) not found.`),
                    );
                }
                if (remove === true) {
                    const d = await removeStrike(p.userId, f.id);
                    return r.edit(
                        d.status
                            ? `Strike (${f.id}) has been removed.`
                            : d.message,
                    );
                }
                return r.edit(
                    embedComment(
                        `## Strike:\n- ID: \`${f.id}\`\n- Moderator: <@${
                            f.mod
                        }> (\`${f.mod}\`)\n- Created: ${time.long.dateTime(
                            f.date,
                        )} (${time.relative(
                            f.date,
                        )})\n- Expires: ${time.long.dateTime(
                            f.expires,
                        )} (${time.relative(f.expires)})\n\n## Reason:\n${
                            f.reason
                        }`,
                        "Green",
                    ),
                );
            }
        }
        const pager = getPaginatedMessage();
        for (const s of chunk(p.strike, 5)) {
            pager.pages.push({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xff5856)
                        .setTitle(`Moderation Strikes`)
                        .setDescription(
                            `${user.toString()} has \`🔥\` **${formatNumber(
                                (p.strike || []).length,
                            )} Strike(s)**.\n\n${s
                                .map(
                                    (c) =>
                                        `- Strike (\`${c.id}\`)\n-# Reason: ${
                                            c.reason || "No Reason?"
                                        }\n-# Expires: ${time.relative(
                                            c.expires,
                                        )}`,
                                )
                                .join("\n")}`,
                        )
                        .setAuthor({
                            name: user.username,
                            iconURL: user.displayAvatarURL(),
                        })
                        .setFooter({
                            text: `⚠️ ${proper(
                                term === "their" ? "they" : term,
                            )} will be banned permanently at 5 Strikes`,
                        }),
                ],
            });
        }
        return pager.run(i, i.user).catch(noop);
    },
});
