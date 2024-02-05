import {
    embedComment,
    formatNumber,
    getAverage,
    getNearest,
    is,
} from "@elara-services/utils";
import { EmbedBuilder, type GuildMember, type User } from "discord.js";
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

    const minutes: string[] = [];
    const messages: string[] = [];
    let minutesEmpty = false;
    let messagesEmpty = false;
    for (let i = 0; i < 3; i++) {
        const ex = i === 0 ? 0 : parseInt(`${i}00`);
        const ex2 = i === 0 ? 0 : 60 * i;
        const hundred = getNearest(profile.messagesSent + ex, 100);
        const multi = i === 0 ? 1 : i === 1 ? 2 : 3;
        if (hundred === 0) {
            messagesEmpty = true;
        }
        if (
            hundred !== 0 &&
            getNearest(profile.messagesSent + ex, 1000) === hundred
        ) {
            messages.push(
                `\`${formatNumber(hundred)} Messages\` | ${
                    customEmoji.a.z_coins
                } **+250 Bonus ${texts.c.u}**, **+1 Reputation**`,
            );
        } else {
            messages.push(
                `\`${formatNumber(
                    messagesEmpty ? 100 * multi : hundred,
                )} Messages\` | ${customEmoji.a.z_coins} **+75 Bonus ${
                    texts.c.u
                }**`,
            );
        }
        const hundred2 = getNearest((profile.active?.count || 0) + ex2, 60);
        const OT = getNearest((profile.active?.count || 0) + ex2, 120);
        if (hundred2 === 0) {
            minutesEmpty = true;
        }
        if (hundred2 !== 0 && OT === hundred2) {
            minutes.push(
                `\`${formatNumber(OT)} Minutes\` | ${
                    customEmoji.a.z_coins
                } **+150 ${texts.c.u}**, **+1 Reputation**`,
            );
        } else {
            minutes.push(
                `\`${formatNumber(
                    minutesEmpty ? 60 * multi : hundred2,
                )} Minutes\` | ${customEmoji.a.z_coins} **+100 Bonus ${
                    texts.c.u
                }**`,
            );
        }
    }
    embed
        .addFields(
            {
                name: "✦ Message Rewards",
                value: messages.map((c) => `> ${c}`).join("\n"),
            },
            {
                name: "✦ Activity Rewards",
                value: minutes.map((c) => `> ${c}`).join("\n"),
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
