import {
    addButtonRow,
    embedComment,
    formatNumber,
    getKeys,
    // formatNumber,
    // getAverage,
    getNearest,
    is,
    make,
    time,
} from "@elara-services/utils";
import {
    ButtonStyle,
    EmbedBuilder,
    type GuildMember,
    type User,
} from "discord.js";
import { economy } from "../../config";
import { /* getAllUserProfiles, */ getProfileByUserId } from "../../services";
// import { sortLB } from "../../services/bot";
import { customEmoji, texts } from "@liyueharbor/econ";
import type { UserWallet } from "@prisma/client";
import moment from "moment-timezone";
import { getRandomImage, userLockedData } from "../../utils";
// import { images } from "../../utils/images";
// import { badges } from "../other/badges";

export async function fetchData(
    user: User,
    requestedMember: GuildMember | null = null,
) {
    // const profiles = await getAllUserProfiles();
    // if (!is.array(profiles)) {
    //     return embedComment(
    //         `Unable to find ${user.toString()} (${user.id})'s profile.`,
    //     );
    // }
    const profile = await getProfileByUserId(user.id);
    // const profile = profiles.find((c) => c.userId === user.id);
    if (!profile) {
        return embedComment(
            `Unable to find ${user.toString()} (${user.id})'s profile.`,
        );
    }
    if (profile.locked) {
        return userLockedData(user.id);
    }
    // const position = sortLB(profiles, "messagesSent", user.id);
    // const badge = profile.badges.find((c) => c.badgeId === "Chatter");
    // let str = "";
    // if (badge) {
    //     const find = badges.find((c) => c.badgeId === badge.badgeId);
    //     if (find) {
    //         const tier = find.tiers.find((c) => c.tierId === badge.tierId);
    //         if (tier) {
    //             str = ` ${tier.emoji} \`${find.badgeId} ${tier.name}\``;
    //         }
    //     }
    // }

    // const dailyStats = profile.dailyStats || [];
    const current = getCurrentDailys(profile);
    // const average =
    //     dailyStats.length > 0
    //         ? getAverage(dailyStats.map((c) => c.messages || 0))
    //         : 0;
    const description = make.array<string>([
        `Each quest completed will give you + ${customEmoji.a.z_repute} **1 Reputation**`,
        `${customEmoji.a.z_info} Rewards from Quests bypass the ${texts.c.u} limits.`,
        // `${customEmoji.a.z_info} Total Messages: **${formatNumber(
        //     profile.messagesSent,
        // )}** (\`#${position}\`)${str}`,
        // `${customEmoji.a.z_info} Average Daily Messages: **${formatNumber(
        //     average,
        // )}**`,
        // `${customEmoji.a.z_bell} Total Active Minutes: **${formatNumber(
        //     profile.active?.count ?? 0,
        // )}**\n`,
    ]);
    const embed = new EmbedBuilder()
        .setColor(0xc0f6fb)
        // .setTitle(
        //     `${requestedMember
        //         ? requestedMember.id === user.id
        //             ? `\`⚜️\` Your`
        //             : `\`⚜️\` Their`
        //         : "`⚜️` Your"
        //     } Commissions`,
        // )
        .setAuthor({
            name: `${user.displayName}'s Quests`,
            iconURL: user.displayAvatarURL(),
        })
        .setDescription(description.join("\n"))
        .setImage(getRandomImage());

    const messages = profile.messagesSent || 0;
    const nearestMessages = getNearest(messages === 0 ? 1 : messages, 100);
    const activeTime = profile.active?.count || 0;
    const nearestTime = getNearest(activeTime === 0 ? 1 : activeTime, 60);

    embed
        .addFields(
            {
                name: `✦ Lifetime Rewards`,
                value: [
                    `\`${formatNumber(messages)}/${formatNumber(
                        nearestMessages,
                    )}\` Messages | +**${customEmoji.a.z_coins} ${formatNumber(
                        economy.mora.quests.messages,
                    )} ${texts.c.u}**`,
                    `\`${formatNumber(activeTime)}/${formatNumber(
                        nearestTime,
                    )}\` Minutes | +**${customEmoji.a.z_coins} ${formatNumber(
                        economy.mora.quests.activity,
                    )} ${texts.c.u}**`,
                ]
                    .map((c) => `> ${c}`)
                    .join("\n"),
            },
            {
                name: `✦ Daily Rewards`,
                value: `>>> Daily quests reset ${time.relative(
                    current.date,
                )}\n${
                    is.number(current.amount)
                        ? `\`${formatNumber(current.user)}/${formatNumber(
                              current.tier,
                          )}\` Messages | +**${
                              customEmoji.a.z_coins
                          } ${formatNumber(current.amount)} ${texts.c.u}**`
                        : `**${
                              requestedMember?.id === user.id
                                  ? `You've`
                                  : "They've"
                          } completed all of the daily quests for today!**`
                }`,
            },
        )
        .setFooter({
            text: `You earn ${economy.mora.min} - ${economy.mora.max} ${texts.c.u} per minute from talking`,
        });

    return {
        embeds: [embed],
        components: [
            addButtonRow({
                id: `ifaq:invite_info:${user.id}`,
                label: `Invite Rewards`,
                emoji: { id: `1091219256395452517` },
                style: ButtonStyle.Primary,
            }),
        ],
    };
}

export function getCurrentDailys(p: UserWallet) {
    const amounts = {
        100: 50,
        250: 100,
        500: 250,
        1000: 500,
    };
    const def = moment().endOf("day");
    const c = p.dailyStats.find(
        (c) => c.date.toISOString() === def.toISOString(),
    );
    if (c && !is.array(c.achieved)) {
        c.achieved = [];
    }
    const tier = (num: keyof typeof amounts = 100) => ({
        user: c?.messages || 0,
        date: c?.date || def.toDate(),
        tier: parseInt(`${num}`),
        got: (c?.messages || 0) >= num,
        amount: amounts[num],
        achieved: (c?.achieved || []).includes(`${num}`) ? true : false,
    });
    if (!c) {
        return tier();
    }
    if (c.messages > 1000) {
        return {
            user: c.messages,
            date: c.date || def.toDate(),
            tier: 1000,
            got: true,
            amount: 0,
            achieved: true,
        };
    }
    for (const num of getKeys(amounts)) {
        if ((c.achieved || []).includes(`${num}`)) {
            continue;
        }
        if (c.messages >= num) {
            return tier(num);
        }
        if (c.messages < num) {
            return tier(num);
        }
    }
    return tier();
}
