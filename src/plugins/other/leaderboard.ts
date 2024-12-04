import {
    chunk,
    embedComment,
    formatNumber,
    getInteractionResponder,
    is,
    noop,
} from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import type { UserWallet } from "@prisma/client";
import { EmbedBuilder, type RepliableInteraction, type User } from "discord.js";
import { getAllUserProfiles } from "../../services";
import { getPaginatedMessage } from "../../utils";

export const emojis = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
};
export type LeaderboardType =
    | "vault"
    | "trivia"
    | "coins"
    | "message"
    | "reputation"
    | "lemon"
    | "elo"
    | string;

export interface Configuration {
    displayText: string;
    displayEmoji: string;
    dataField: keyof UserWallet;
}

export const add = (
    displayText: Configuration["displayText"],
    displayEmoji: Configuration["displayEmoji"],
    dataField: Configuration["dataField"],
) => {
    return { displayText, displayEmoji, dataField };
};

export const configurationByType: Record<LeaderboardType, Configuration> = {
    [texts.c.l]: add(texts.c.u, customEmoji.a.z_coins, "balance"),
    vault: add(`Vault`, customEmoji.a.z_coins, "vault"),
    message: add("Messages", customEmoji.a.z_diamond, "messagesSent"),
    reputation: add("Reputation", customEmoji.a.z_repute, "staffCredits"),
    lemon: add("Lemons", customEmoji.a.z_lemon, "lemon"),
    elo: add("Ranking Elo", customEmoji.a.questionMark, "elo"),
    trivia: add("Trivia Wins", customEmoji.a.questionMark, "triviaPoints"),
    levels: add("Levels", customEmoji.a.z_diamond, "vault"),
};
export async function handleLeaderboard(
    { displayEmoji, displayText, dataField }: Configuration,
    interaction: RepliableInteraction,
    searchUser: User | null = null,
) {
    if (!interaction.isRepliable()) {
        return;
    }
    const r = getInteractionResponder(interaction);
    // Read the leaderboard data from files and filter out users with 0 or less
    const leaderboard = (
        await getAllUserProfiles({
            where: {
                // Filter out users with 0 or less
                [`${dataField}`]: {
                    gt: 0,
                },
            },
            // Sort the leaderboard
            orderBy: { [`${dataField}`]: "desc" },
        })
    )
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .map((x) => ({ id: x.userId, count: x[`${dataField}`] }));

    if (searchUser) {
        const find = leaderboard.find((c) => c.id === searchUser.id);
        if (!find) {
            return r.edit(
                embedComment(
                    `Unable to find (${searchUser.toString()}) in the (${displayText}) leaderboard!`,
                ),
            );
        }
        return r.edit(
            embedComment(
                `${displayEmoji} ${searchUser.toString()} (\`${
                    searchUser.username
                }\`) is (#${formatNumber(
                    leaderboard.map((c) => c.id).indexOf(searchUser.id) + 1,
                )}) in the **${displayText}** Leaderboard!`,
                "Aqua",
            ),
        );
    }
    // Split the leaderboard into pages
    const pages = getLeaderboardPages(leaderboard, displayText);
    if (!pages.length) {
        return r.edit(embedComment(`I found no one on the leaderboard!`));
    }

    const pager = getPaginatedMessage();
    // This removes the 'String Select Menu' from the default actions, to allow for multiple pages.
    let i = 0;
    for (const p of pages) {
        i++;
        const embed = new EmbedBuilder()
            .setColor(0xc0f6fb)
            .setTitle(
                `${displayEmoji} \`${displayText} Leaderboard\` (Page ${i}/${pages.length})`,
            )
            .setDescription(p);
        if (!p.includes(interaction.user.id)) {
            const data = leaderboard.find((c) => c.id === interaction.user.id);
            const position =
                leaderboard.map((c) => c.id).indexOf(interaction.user.id) + 1;
            if (data && (is.string(data.count) || is.number(data.count))) {
                embed.data.description += `\n\n**\`#${position}\` | ${interaction.user.toString()} - ${formatNumber(
                    data.count,
                )} ${displayText}**`;
            }
        }
        pager.pages.push({ embeds: [embed] });
    }

    return pager.run(interaction, interaction.user).catch(noop); // Ignore these, they only error out if the message/interaction got deleted
}

export function getLeaderboardPages<T>(
    leaderboard: {
        id: string;
        count: T;
    }[],
    displayText: string,
) {
    const pages = [];
    const addUserText = (id: string, count: T, position: number) =>
        `${
            emojis[position as keyof typeof emojis] || `\`#${position}\``
        } | <@${id}> - ${
            is.number(count) ? formatNumber(count) : count
        } ${displayText.replace(/ranking( )?/gi, "")}`;
    let i = 0;
    for (const users of chunk(leaderboard, 10)) {
        const page: string[] = [];
        for (const user of users) {
            i++;
            page.push(addUserText(user.id, user.count, i));
        }
        pages.push(page.join("\n"));
    }
    return pages;
}
