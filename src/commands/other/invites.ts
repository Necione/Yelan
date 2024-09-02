import {
    buildCommand,
    getUser,
    type SlashCommand,
} from "@elara-services/botbuilder";
import {
    addButtonRow,
    discord,
    embedComment,
    field,
    formatNumber,
    get,
    Invites,
    is,
    log,
} from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import {
    ButtonStyle,
    EmbedBuilder,
    type GuildMember,
    type Role,
    SlashCommandBuilder,
} from "discord.js";
import { roles } from "../../config";
import { getAuthor } from "../../plugins/other/invites";
import { getProfileByUserId } from "../../services";
import { cooldowns, logs } from "../../utils";

const conf = {
    rewards: [
        {
            role: "1278919375377793055",
            invites: 10,
        },
    ] as {
        role: string;
        invites: number;
    }[],
};

export const invites = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`invites`)
        .setDescription(`Track your invites in the server`)
        .setDMPermission(false)
        .addUserOption((o) =>
            getUser(o, {
                name: "user",
                description: `[STAFF]: What user do you want to look at?`,
                required: false,
            }),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const p = await getProfileByUserId(i.user.id);
        if (!p) {
            return r.edit(
                embedComment(`Unable to find/create your user profile.`),
            );
        }
        if (p.locked) {
            return r.edit(
                embedComment(
                    `You're user profile is locked, you can't use this command.`,
                ),
            );
        }
        const cool = cooldowns.get(
            p,
            "invites",
            `You can't lookup anyone until %DURATION%`,
        ); // Leave this in bitches, don't want Discord to get pissed at the bot and block it from using the endpoint.
        if (!cool.status) {
            return r.edit(embedComment(cool.message));
        }
        let user = i.user;
        const u = i.options.getUser("user", false);
        const isStaff = i.member.roles.cache.hasAny(
            ...[...roles.main, roles.moderator],
        );
        if (isStaff && u) {
            user = u;
        }
        if (!user || user.bot) {
            return r.edit(
                embedComment(`Unable to find that user or it's a bot account.`),
            );
        }
        const member = (await discord.member(
            i.guild,
            user.id,
            true,
            true,
        )) as GuildMember;
        if (!member) {
            return r.edit(
                embedComment(
                    `Unable to find ${user.toString()}'s member information in this server.`,
                ),
            );
        }
        const isSame = user.id === i.user.id;
        if (!isSame) {
            const pp = await getProfileByUserId(user.id);
            if (!pp) {
                return r.edit(
                    embedComment(
                        `Unable to find/create ${user.toString()}'s user profile.`,
                    ),
                );
            }
            if (pp.locked) {
                return r.edit(
                    embedComment(
                        `${user.toString()}'s user profile is locked, they don't have access to this command.`,
                    ),
                );
            }
        }
        const db = await Invites.formatBy(i.guild, user.id, 1000, true);
        if (!db.status) {
            if (db.message.includes("No users")) {
                return r.edit(
                    embedComment(
                        `${user.toString()} doesn't have any permanent active & used invites.`,
                    ),
                );
            }
            return r.edit(embedComment(db.message));
        }
        const data = db.data.get(user.id);
        if (!data) {
            return r.edit(
                embedComment(`Unable to find any invite information for you.`),
            );
        }
        if (!isStaff) {
            await cooldowns.set(p, "invites", get.mins(2)); // Leave this in bitches, don't want Discord to get pissed at the bot and block it from using the endpoint.
        }
        const rewards: string[] = [];
        if (is.array(conf.rewards)) {
            const add: Role[] = [];
            for (const r of conf.rewards.sort(
                (a, b) => b.invites - a.invites,
            )) {
                const role = i.guild.roles.resolve(r.role);
                const completed =
                    member.roles.cache.has(r.role) || data.invited >= r.invites;
                const bar = completed
                    ? `🎉 Completed!`
                    : `${formatNumber(data.invited)}/${formatNumber(
                          r.invites,
                      )}`;
                if (role) {
                    if (!role.editable) {
                        rewards.push(
                            `${customEmoji.a.questionMark}: **${formatNumber(
                                r.invites,
                            )} Invites**\n-# Progress: ${bar}\n-# Reward: ${role.toString()} | This role can't be added by me, contact an Admin to fix this!`,
                        );
                    } else if (completed) {
                        const hasRole = member.roles.cache.has(r.role);
                        if (!hasRole) {
                            add.push(role);
                        }
                        rewards.push(
                            `\`✅\`: **${formatNumber(
                                r.invites,
                            )} Invites**\n-# Progress: ${bar}\n-# Reward: ${role.toString()}`,
                        );
                    } else {
                        rewards.push(
                            `${customEmoji.a.questionMark}: **${formatNumber(
                                r.invites,
                            )} Invites**\n-# Progress: ${bar}\n-# Reward: ${role.toString()}`,
                        );
                    }
                }
            }
            if (is.array(add)) {
                await member.roles.add(add, `Invite rewards!`).catch(log);
                await logs.misc({
                    content: `> ${user.toString()} (${
                        user.id
                    }) invite rewards given ${add
                        .map((c) => `\`${c.name}\``)
                        .join(", ")}`,
                    allowedMentions: { parse: [] },
                });
            }
        }

        const embed = new EmbedBuilder()
            .setColor(member.displayColor)
            .setTitle(`Invite Rewards`)
            .addFields(
                field(
                    `\u200b`,
                    `- Unique: ${formatNumber(
                        data.invited,
                    )}\n- Total Uses: ${formatNumber(data.uses)}`,
                ),
            )
            .setFooter({ text: `Rewards are given based on unique invites` })
            .setAuthor(getAuthor(member, user));
        if (is.array(rewards)) {
            embed.setDescription(rewards.join("\n\n"));
        }
        return r.edit({
            embeds: [embed],
            components: [
                addButtonRow({
                    id: `ifaq:invites`,
                    emoji: { name: "❔" },
                    style: ButtonStyle.Success,
                }),
            ],
        });
    },
});
