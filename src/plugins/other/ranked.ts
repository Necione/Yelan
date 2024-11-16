import {
    discord,
    embedComment,
    formatNumber,
    getEntries,
    is,
    noop,
    time,
} from "@elara-services/utils";
import type { RankedGame } from "@prisma/client";
import { EmbedBuilder, type GuildMember, type User } from "discord.js";
import { prisma } from "../../prisma";
import { getProfileByUserId } from "../../services";
export type RankingTier = {
    name: string;
    roleId: string;
    min: number;
    max: number;
    emoji: string;
};
const rank = (
    name: string,
    roleId: string,
    min: number,
    max: number,
    emoji: string,
): RankingTier => {
    return { name, roleId, min, max, emoji };
};

export const ranking = {
    channelId: "1121267372473466993",
    scorer: "1120185827528556576",
    eloLog: "1079648430743363704",
    announceId: "1132465393622069278",
    tiers: [
        rank(
            "Ruby",
            "1169523016821129246",
            1600,
            2000,
            `<:Ruby:1169523489519173683>`,
        ),
        rank(
            "Emerald",
            "1159607705598689360",
            1400,
            1599,
            `<:Emerald:1169512431316373568>`,
        ),
        rank(
            "Diamond",
            "1154193810423824466",
            1200,
            1399,
            `<:Diamond:1169512361581883452>`,
        ),
        rank(
            "Gold",
            "1138667398317228052",
            1100,
            1199,
            `<:Gold:1169512264328556556>`,
        ),
        rank(
            "Iron",
            "1169729737279684690",
            1001,
            1099,
            `<:Iron:1169502316982960189>`,
        ),
    ],
};

export async function fetchData(
    user: User,
    requestingMember: GuildMember | null = null,
) {
    if (user.bot) {
        return embedComment(`The user you provided is a bot account.`);
    }
    if (!requestingMember) {
        return embedComment(
            `Unable to find the server you're requesting from.`,
        );
    }
    const [data, profile, member] = await Promise.all([
        fetchRankedData(user.id),
        getProfileByUserId(user.id),
        discord.member(requestingMember.guild, user.id, true),
    ]);
    if (!member) {
        return embedComment(
            `Unable to find ${user.toString()} in this server.`,
        );
    }
    if (!data || !profile) {
        return embedComment(
            `Unable to find ${user.toString()}'s Ranked TCG data.`,
        );
    }
    const { currentRank } = getRankedRoles(member, profile.elo || 0, false);
    const embed = new EmbedBuilder()
        .setColor(0xc0f6fb)
        .setThumbnail(user.displayAvatarURL())
        .setTitle(`\`⚜️\` ${user.displayName}'s Ranked TCG Stats`)
        .setFooter({ text: `UID: ${profile.rankedUID || "NOT_SET"}` })
        .setDescription(
            [
                `<a:z_elo:1121633552019243028> Current Elo: **${formatNumber(
                    profile.elo || 0,
                )}**`,
                `${
                    currentRank?.emoji || "<:nothing:1104230316517904385>"
                } Current Rank: ${currentRank?.role || "**None**"}`,
                `\n`,
                `🏆 Wins: **${formatNumber(
                    data.wins,
                )}** | Losses: **${formatNumber(data.loses)}** | WLR: **${
                    (data.wins / data.matches) * 100 || "0"
                }%**`,
                `⚔️ Highest Winstreak: **${
                    data.highestStreak || data.streak
                } Wins**`,
            ].join("\n"),
        );
    if (is.array(data.games)) {
        const sort = sortGames(data.games).slice(0, 5);
        embed.addFields({
            name: "✦ Recent Games ⸻༺༻",
            value: sort
                .map(
                    (c) =>
                        `\`${c.win ? "🟢" : "🔴"}\` VS <@${
                            c.userId
                        }> ${time.relative(new Date(c.date))}`,
                )
                .join("\n"),
        });
    } else {
        embed.addFields({
            name: `✦ Recent Games ⸻༺༻`,
            value: `> You have no recent games...`,
        });
    }
    return {
        embeds: [embed],
        components: [],
        content: null,
        files: [],
        attachments: [],
    };
}

export function sortGames(games: RankedGame[]) {
    if (!is.array(games)) {
        return [];
    }
    return games.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}

export async function fetchRankedData(userId: string) {
    return prisma.rankedData
        .upsert({
            where: { userId },
            create: { userId },
            update: {},
        })
        .catch(noop);
}

export function getRankedRoles(
    member: GuildMember | null,
    elo: number,
    checkIfRoleExists = true,
) {
    if (checkIfRoleExists) {
        if (!member || !member?.roles?.cache) {
            return { should: false, roles: [], currentRank: null };
        }
    }
    let roles =
        checkIfRoleExists && member ? [...member.roles.cache.keys()] : [];
    let should = false;
    let currentRank = null;
    for (const { roleId, max, min, name, emoji } of ranking.tiers) {
        if (!roleId) {
            continue;
        }
        const r = member?.guild?.roles?.resolve(roleId);
        if (checkIfRoleExists) {
            if (!r) {
                continue;
            }
        }
        if (roles.includes(roleId)) {
            should = true;
            roles = roles.filter((c) => c !== roleId);
        }
        if (elo >= min && elo <= max) {
            if (!currentRank) {
                currentRank = {
                    name,
                    role: r ? `<@&${roleId}>` : `\`${name}\``,
                    emoji,
                };
            }
            should = true;
            roles.push(roleId);
        }
    }
    return { roles, should, currentRank };
}

export const regions = {
    asia: [1, 2, 5, 8],
    america: [6],
    europe: [7],
    other: [9],
};
export function getRankedRegion(region: number) {
    for (const [name, value] of getEntries(regions)) {
        if (value.includes(region)) {
            return `${name.slice(0, 1).toUpperCase()}${name.slice(
                1,
                name.length,
            )}`;
        }
    }
    return "";
}
