import { getData } from "@elara-services/leveling";
import {
    addButton,
    discord,
    embedComment,
    is,
    noop,
} from "@elara-services/utils";
import type { UserWallet } from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonStyle,
    Colors,
    EmbedBuilder,
    type ButtonBuilder,
    type GuildMember,
    type User,
} from "discord.js";
import { mainServerId, roles } from "../../config";
import { getProfileByUserId } from "../../services";
import { lb } from "../../services/bot";
import { levels } from "../../services/levels";
import { locked, userLockedData } from "../../utils";
import { images } from "../../utils/images";
import { createProfile } from "../canvas/profile";

export function getBackgroundUrl(backgroundUrl?: string | null | undefined) {
    if (backgroundUrl && backgroundUrl.match(/https:\/\//gi)) {
        return backgroundUrl;
    }
    return images.commands.profile.background;
}

export function getFrameUrl(frameUrl: string | null | undefined) {
    if (frameUrl && frameUrl.match(/https:\/\//gi)) {
        return frameUrl;
    }
    return images.commands.profile.frame;
}

export function profileHidden() {
    return {
        files: [
            {
                name: "hidden.png",
                attachment: images.commands.profile.hidden,
            },
        ],
    };
}

export const allowedDomains = ["https://i.imgur.com/"];

const cpro = {
    messages: 50_000,
    achievements: 100,
    cards: 100,
    roles: {
        staff: "1099766553362313287",
        sage: "1200214926065680404",
        buyWinner: "1083205157082365992",
        contributor: "1093982886438391818",
    },
};

export async function createCanvasProfile(
    user: User,
    p: UserWallet,
    guildId: string,
    url?: string,
) {
    const [mora, messages, rep, lemon, elo] = await lb(user.id);
    const lvl = await levels.api.users.get(user.id, guildId);
    const db = getData(
        // @ts-ignore
        lvl.status
            ? lvl.data
            : {
                  xp: 0,
                  level: 0,
              },
    );
    const g = user.client.guilds.resolve(mainServerId);
    let member: GuildMember | null = null;
    if (g && g.available) {
        member = await discord.member(g, user.id, true, true);
    }
    const hasRole = (roles: (string | undefined)[]) =>
        member?.roles.cache.hasAny(
            // @ts-ignore
            ...(roles || []).filter((c) => is.string(c)),
        ) || false;

    const bypass = hasRole([
        roles.devs,
        ...roles.main.filter((c) => c !== roles.admin),
    ]);

    return createProfile({
        pfp: user.displayAvatarURL({ extension: "png" }),
        mora: p.balance,
        vault: p.vault || 0,
        msgs: p.messagesSent,
        lemon: p.lemon,
        name: user.username,
        rep: p.staffCredits || 0,
        background: getBackgroundUrl(url || p.backgroundUrl),
        frame: getFrameUrl(p.frameUrl),
        leaderboard: {
            mora: mora || 0,
            lemon: lemon || 0,
            msgs: messages || 0,
            rep: rep || 0,
            elo: elo || 0,
        },
        icons: {
            messages: bypass || (p.messagesSent || 0) >= cpro.messages,
            achievements: bypass || p.achievements.length >= cpro.achievements,
            booster: bypass || hasRole([g?.roles.premiumSubscriberRole?.id]),
            cards: bypass || p.collectables.length >= cpro.cards,
            contributor: bypass || hasRole([cpro.roles.contributor]),
            sage: bypass || hasRole([cpro.roles.sage]),
            staff: bypass || hasRole([cpro.roles.staff]),
            winner: bypass || hasRole([cpro.roles.buyWinner]),
        },
        toggles: {
            background: p.backgroundHidden,
            frame: p.frameHidden,
        },
        progress: {
            total: db.xp.required,
            current: db.xp.current,
            label: (
                await levels.api.servers.levels.getLevelName(guildId, db.level)
            ).message,
            next: (
                await levels.api.servers.levels.getLevelName(
                    guildId,
                    db.level + 1,
                )
            ).message,
        },
    });
}

export async function fetchData(
    user: User,
    requestingMember: GuildMember | null = null,
    sendInDms = true,
) {
    if (!requestingMember) {
        return embedComment(`Invalid member.`);
    }
    if (user.bot) {
        return {
            content: null,
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Fuchsia)
                    .setTitle(`You really thought bots could have a profile?`)
                    .setImage(
                        images.commands.profile.bots[
                            Math.floor(
                                Math.random() *
                                    images.commands.profile.bots.length,
                            )
                        ],
                    ),
            ],
            files: [],
            attachments: [],
            components: [],
        };
    }
    const p = await getProfileByUserId(user.id);
    if (!p) {
        return embedComment(`I was unable to fetch the user's profile.`);
    }
    if (p.locked) {
        if (
            !requestingMember ||
            !requestingMember.roles.cache.has(roles.admin)
        ) {
            return userLockedData(p.userId);
        }
    }
    const data = await createCanvasProfile(user, p, requestingMember?.guild.id);

    if (p.hidden) {
        if (requestingMember?.id === user.id) {
            if (sendInDms) {
                // Send the profile image to the user's DM
                const sent = await user
                    .send({
                        content: "> This is your profile:",
                        files: [{ name: "profile.png", attachment: data }],
                    })
                    .catch(noop);

                if (!sent) {
                    return embedComment(
                        `I was unable to send your profile in DMs, make sure you have them enabled!`,
                    );
                }
                return embedComment(
                    "I've sent your profile to your DMs.",
                    "Green",
                );
            }
        } else {
            return profileHidden();
        }
    }
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (requestingMember?.id === user.id && !locked.has(user.id)) {
        row.addComponents(
            addButton({
                id: `profile|custom_background`,
                label: `Edit Background`,
                style: ButtonStyle.Secondary,
                emoji: {
                    id: "1240497023971496026",
                    name: "Pencil",
                },
            }),
        );

        if (p.backgroundUrl) {
            row.addComponents(
                addButton({
                    id: `profile|reset_background`,
                    label: "Reset Background",
                    style: ButtonStyle.Secondary,
                }),
            );
        }
    }

    const regionNames: { [key: number]: string } = {
        8: "Asia",
        7: "Europe",
        6: "America",
    };
    const regionName =
        p.rankedRegion != null && regionNames[p.rankedRegion]
            ? regionNames[p.rankedRegion]
            : "Other";
    const uidContent = p.rankedUID
        ? `> UID: \`${p.rankedUID}\` (${regionName})`
        : "> UID: Not Set, use </uid:1204385940231950397>";

    return {
        embeds: [],
        content: uidContent,
        files: [{ name: "profile.png", attachment: data }],
        components: row.components.length ? [row] : [],
    };
}
