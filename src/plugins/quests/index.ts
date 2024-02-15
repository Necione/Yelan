import {
    embedComment,
    formatNumber,
    getAverage,
    getNearest,
    is,
    time,
} from "@elara-services/utils";
import { EmbedBuilder, type GuildMember, type User } from "discord.js";
import moment from "moment";
import { economy, mainServerId } from "../../config";
import { getAllUserProfiles } from "../../services";
import { getStore, sortLB } from "../../services/bot";
import {
    customEmoji,
    getRandomImage,
    texts,
    userLockedData,
} from "../../utils";
import { images } from "../../utils/images";
import { badges } from "../other/badges";

export async function fetchData(
    user: User,
    requestedMember: GuildMember | null = null,
) {
    const profiles = await getAllUserProfiles();
    if (!is.array(profiles)) {
        return embedComment(
            `Unable to find ${user.toString()} (${user.id})'s profile.`,
        );
    }
    const profile = profiles.find((c) => c.userId === user.id);
    if (!profile) {
        return embedComment(
            `Unable to find ${user.toString()} (${user.id})'s profile.`,
        );
    }
    if (profile.locked) {
        return userLockedData(user.id);
    }
    const position = sortLB(profiles, "messagesSent", user.id);
    const badge = profile.badges.find((c) => c.badgeId === "Chatter");
    let str = "";
    if (badge) {
        const find = badges.find((c) => c.badgeId === badge.badgeId);
        if (find) {
            const tier = find.tiers.find((c) => c.tierId === badge.tierId);
            if (tier) {
                str = ` ${tier.emoji} \`${find.badgeId} ${tier.name}\``;
            }
        }
    }
    const store = await getStore(mainServerId);
    let welkin = null;
    if (store && is.array(store.items)) {
        welkin = store.items.find((c) => c.name === "Welkin Moon");
    }
    // store.find((c) => c.name === "Welkin Moon");
    const dailyStats = profile.dailyStats || [];
    const today = dailyStats.find(
        (c) => c.date.toISOString() === moment().endOf("day").toISOString(),
    );
    const average =
        dailyStats.length > 0
            ? getAverage(dailyStats.map((c) => c.messages || 0))
            : 0;
    const description = [
        `${customEmoji.a.z_info} Total Messages: **${formatNumber(
            profile.messagesSent,
        )}** (\`#${position}\`)${str}`,
        `${customEmoji.a.z_info} Average Daily Messages: **${formatNumber(
            average,
        )}**`,
        `${customEmoji.a.z_bell} Total Active Minutes: **${formatNumber(
            profile.active?.count ?? 0,
        )}**\n`,
    ];
    if (welkin) {
        const percent = Math.floor((profile.balance * 100) / welkin.cost);
        if (profile.balance >= welkin.cost) {
            description.push(
                `${
                    customEmoji.a.z_diamond
                } Progress to Welkin: \`${formatNumber(
                    welkin.cost,
                )} / ${formatNumber(welkin.cost)}\` (**100%**)`,
            );
        } else {
            description.push(
                `${
                    customEmoji.a.z_diamond
                } Progress to Welkin: \`${formatNumber(
                    profile.balance,
                )} / ${formatNumber(welkin.cost)}\` (**${percent}%**)`,
            );
        }
    }
    const embed = new EmbedBuilder()
        .setColor(0xc0f6fb)
        .setTitle(
            `${
                requestedMember
                    ? requestedMember.id === user.id
                        ? `\`⚜️\` Your`
                        : `\`⚜️\` Their`
                    : "`⚜️` Your"
            } Commissions`,
        )
        .setDescription(description.join("\n"))
        .setImage(getRandomImage());

    const messages = today?.messages || 0;
    const nearestMessages = getNearest(messages === 0 ? 1 : messages, 100);
    const activeTime = profile.active?.count || 0;
    const nearestTime = getNearest(activeTime === 0 ? 1 : activeTime, 60);

    embed
        .addFields(
            {
                name: "✦ Message Rewards",
                value: `>>> \`${messages}/${nearestMessages}\` | ${
                    customEmoji.a.z_coins
                } **+75 Bonus Coins**\n*Message Quests reset ${time.relative(
                    moment().endOf("day").toISOString(),
                )}*`,
            },
            {
                name: "✦ Activity Rewards",
                value: `>>> \`${activeTime}/${nearestTime} Minutes\` | ${customEmoji.a.z_coins} **+100 Bonus Coins**\n *Activity Quests never reset*`,
            },
        )
        .setFooter({
            text: `You currently earn ${economy.mora.min} - ${economy.mora.max} ${texts.c.u} per minute`,
            iconURL: images.commands.quests.footer,
        });

    return {
        embeds: [embed],
    };
}
