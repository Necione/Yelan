import type { FetchedMemberInvitesResponse } from "@elara-services/invite";
import {
    addButtonRow,
    colors,
    discord,
    embedComment,
    field,
    formatNumber,
    getInteractionResponder,
    is,
    make,
    noop,
    time,
    type ButtonOptions,
    type getInteractionResponders,
} from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import {
    ButtonStyle,
    Collection,
    EmbedBuilder,
    type ButtonInteraction,
    type Guild,
    type GuildMember,
    type Interaction,
    type Role,
    type User,
} from "discord.js";
import { getProfileByUserId } from "../../services";
import {
    inviteCache,
    inviteCacheUpdates,
    logs,
    updateInvitesCache,
    userLockedData,
} from "../../utils";

const conf = {
    rewards: make.array<{
        role: string;
        invites: number;
    }>([
        {
            role: "1278919375377793055",
            invites: 10,
        },
    ]),
};

export async function handleInviteInteraction(i: ButtonInteraction) {
    if (!isInviteInt(i) || !i.inCachedGuild()) {
        return;
    }
    const r = getInteractionResponder(i);
    const [, type, userId] = i.customId.split(":");
    if (type === "invites") {
        return r.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Invites FAQ`)
                    .setColor(colors.cyan)
                    .setAuthor(getAuthor(i.member, i.user))
                    .setDescription(
                        [
                            `You have to create the invite others will use, you CAN'T use the vanity link (\`.gg/liyue\`)`,
                            `**Only unique users is counted towards invite rewards**`,
                            `The users HAVE to stay in the server for the invite to be counted.`,
                            `The only users that will be counted is the ones that were invited within the past 30 days.`,
                            `There will be a delay between the invite stats updating, the cache updating timer is below.`,
                        ]
                            .map((c) => `- ${c}`)
                            .join("\n"),
                    )
                    .addFields({
                        name: "Cache Updater",
                        value: `- Last: ${
                            inviteCacheUpdates.last
                                ? time.relative(inviteCacheUpdates.last)
                                : "N/A"
                        }\n- Next: ${
                            inviteCacheUpdates.next
                                ? time.relative(inviteCacheUpdates.next)
                                : "N/A"
                        }`,
                    }),
            ],
            components: getComponents(userId, {
                invite_faq: false,
                invite_info: true,
                invite_data: true,
            }),
        });
    }
    if (type === "invite_info") {
        await r.deferUpdate();
        return generateInviteInfo(i.guild, userId, r);
    }
    if (type === "invites_data") {
        await r.deferUpdate();
        const m = await discord.member(i.guild, userId, true);
        if (!m) {
            return r.edit(
                embedComment(`Unable to find (${userId}) in this server.`),
            );
        }
        const d = inviteCache.get(userId);
        if (!is.array(d)) {
            return r.edit(
                embedComment(
                    `<@${userId}> doesn't have any invites from the past 30 days.`,
                ),
            );
        }
        const { codes } = getInviteData(d);
        if (!codes.size) {
            return r.edit(
                embedComment(
                    `<@${userId}> doesn't have any active invites from the past 30 days.`,
                ),
            );
        }
        return r.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Invites`)
                    .setColor(colors.cyan)
                    .setAuthor(getAuthor(m, m.user))
                    .setFooter({ text: `Code - active/total` })
                    .setDescription(
                        codes
                            .sort((a, b) => b.uses - a.uses)
                            .map(
                                (c) =>
                                    `- \`${c.code}\` - ${formatNumber(
                                        c.uses,
                                    )}/${formatNumber(c.total)}`,
                            )
                            .join("\n"),
                    ),
            ],
            components: getComponents(userId, {
                invite_data: false,
                invite_info: true,
            }),
        });
    }
}

export function getComponents(
    userId: string,
    options?: {
        invite_faq?: boolean;
        invite_info?: boolean;
        invite_data?: boolean;
    },
) {
    const buttons = make.array<ButtonOptions>([]);
    if (options?.invite_faq !== false) {
        buttons.push({
            id: `ifaq:invites:${userId}`,
            emoji: { name: "❔" },
            style: ButtonStyle.Success,
        });
    }
    if (options?.invite_info === true) {
        buttons.push({
            id: `ifaq:invite_info:${userId}`,
            emoji: { name: "👀" },
            style: ButtonStyle.Secondary,
        });
    }
    if (options?.invite_data === true) {
        buttons.push({
            id: `ifaq:invites_data:${userId}`,
            emoji: { name: "📄" },
            style: ButtonStyle.Secondary,
        });
    }

    return [addButtonRow(buttons)];
}

export function isInviteInt(i: Interaction) {
    return i.isButton() && i.inCachedGuild() && i.customId.startsWith("ifaq:");
}

export async function generateInviteInfo(
    guild: Guild,
    userId: string,
    r: getInteractionResponders,
) {
    const member = await discord.member(guild, userId, true);
    if (!member) {
        return r.edit(
            embedComment(`Unable to fetch <@${userId}> in this server.`),
        );
    }
    const user = member.user;
    const p = await getProfileByUserId(user.id);
    if (!p) {
        return r.edit(
            embedComment(
                `Unable to fetch/create <@${user.id}>'s user profile.`,
            ),
        );
    }
    if (p.locked) {
        return r.edit(userLockedData(userId));
    }
    if (!inviteCache.size) {
        await updateInvitesCache(guild.client.invites);
    }
    const m = inviteCache.get(user.id);
    if (!is.array(m)) {
        return r.edit(
            embedComment(
                `${user.toString()} doesn't have any invites from the past 30 days.`,
            ),
        );
    }
    const { invited, total } = getInviteData(m);
    const rewards: string[] = [];
    if (is.array(conf.rewards)) {
        const add: Role[] = [];
        for (const r of conf.rewards.sort((a, b) => b.invites - a.invites)) {
            const role = guild.roles.resolve(r.role);
            const completed =
                member.roles.cache.has(r.role) || invited >= r.invites;
            const bar = completed
                ? `🎉 Completed!`
                : `${formatNumber(invited)}/${formatNumber(r.invites)}`;
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
            await member.roles.add(add, `Invite rewards!`).catch(noop);
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
                    invited,
                )}\n- Total Uses: ${formatNumber(total)}`,
            ),
        )
        .setFooter({ text: `Rewards are given based on unique invites` })
        .setAuthor(getAuthor(member, user));
    if (is.array(rewards)) {
        embed.setDescription(rewards.join("\n\n"));
    }
    return r.edit({
        embeds: [embed],
        components: getComponents(user.id, {
            invite_data: true,
            invite_info: false,
        }),
    });
}

export function getAuthor(member: GuildMember, user: User) {
    return {
        name:
            member.displayName === user.displayName
                ? user.displayName
                : `${member.displayName} (${user.username})`,
        iconURL: member.displayAvatarURL(),
    };
}

export function getInviteData(m: FetchedMemberInvitesResponse["members"]) {
    const codes = new Collection<
        string,
        { code: string; uses: number; total: number }
    >();
    for (const mm of m) {
        if (!mm.source_invite_code) {
            continue;
        }
        const cc = codes.get(mm.source_invite_code);
        if (cc) {
            cc.uses++;
        } else {
            codes.set(mm.source_invite_code, {
                total: mm.uses || 0,
                uses: 1,
                code: mm.source_invite_code,
            });
        }
    }
    return {
        invited: codes.map((c) => c.uses).reduce((a, b) => a + b, 0) || 0,
        total: codes.map((c) => c.total).reduce((a, b) => a + b, 0) || 0,
        codes,
    };
}
