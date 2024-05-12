import { getData } from "@elara-services/leveling";
import { addButton, embedComment } from "@elara-services/utils";
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
import { roles } from "../../config";
import { getProfileByUserId } from "../../services";
import { lb } from "../../services/bot";
import { levels } from "../../services/levels";
import { locked, userLockedData } from "../../utils";
import { images } from "../../utils/images";
import { createProfile } from "../canvas/profile";
import { profile } from "../context";

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
                    .catch(() => null);

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

    return {
        embeds: [],
        content: `> Genshin UID: ${profile.rankedUID || "NOT_SET"}`,
        files: [{ name: "profile.png", attachment: data }],
        components: row.components.length ? [row] : [],
    };
}
