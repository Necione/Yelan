import {
    buildCommand,
    getBool,
    getUser,
    sendFile,
} from "@elara-services/botbuilder";
import {
    discord,
    embedComment,
    formatNumber,
    is,
    log,
    time,
} from "@elara-services/utils";
import { mainServerId, roles } from "../../../../config";
import { getProfileByUserId } from "../../../../services";
import { customEmoji, texts } from "../../../../utils";

export const view = buildCommand({
    subCommand: (b) =>
        b
            .setName(`view`)
            .setDescription(`View a user's profile`)
            .addUserOption((o) => getUser(o, { required: false }))
            .addBooleanOption((o) =>
                getBool(o, {
                    name: `json`,
                    description: `[DEVS]: Get the JSON version of their profile`,
                }),
            ),
    locked: {
        roles: [
            ...roles.main,
            roles.graders,
            roles.moderator,
            roles.management.econ,
        ],
    },
    async execute(i) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const user = i.options.getUser("user", false) ?? i.user;
        const json = i.options.getBoolean("json", false);
        if (user.bot) {
            return i
                .editReply(embedComment(`Bots don't have a profile.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const p = await getProfileByUserId(user.id);
        if (!p) {
            return i
                .editReply(embedComment(`Unable to find their user profile.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        if (
            json === true &&
            i.member.roles.cache.hasAny(...roles.main) &&
            i.guildId !== mainServerId
        ) {
            return i
                .editReply(sendFile(user.id, p))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const member = await discord.member(i.guild, user.id, true);
        const toggle = (bool: boolean) => (bool ? "🟢" : "🔴");
        return i.editReply({
            embeds: [
                {
                    title: "Profile Data",
                    description: [
                        `Locked: ${toggle(p.locked || false)}`,
                        `${texts.c.u}: ${formatNumber(p.balance)}`,
                        `Vault: ${formatNumber(p.vault)}`,
                        `Rakeback: ${formatNumber(p.rakeback?.amount || 0)}${
                            p.rakeback?.claimed &&
                            Date.now() < p.rakeback.claimed
                                ? ` (${time.relative(
                                      new Date(p.rakeback.claimed),
                                  )})`
                                : ""
                        }`,
                        `Messages: ${formatNumber(p.messagesSent)}`,
                        `Rep: ${formatNumber(p.staffCredits)}`,
                        `Lemons: ${formatNumber(p.lemon)}`,
                        `Elo: ${formatNumber(p.elo || 0)}`,
                        `Trivia Points: ${formatNumber(p.triviaPoints || 0)}`,
                        `Genshin UID: ${p.rankedUID || "NOT SET"}`,
                        `Frame URL: ${p.frameUrl || "NOT_SET"}`,
                        `Profile Background: ${p.backgroundUrl || "NOT SET"}`,
                        `Mute Mentions: ${toggle(
                            is.boolean(p.muteMentions) ? p.muteMentions : false,
                        )}`,
                        `Hidden:\n- Profile: ${toggle(
                            p.hidden || false,
                        )}\n- Background: ${toggle(
                            p.backgroundHidden || false,
                        )}\n- Frame: ${toggle(p.frameHidden || false)}`,
                        `History:\n- ${texts.c.u} Gained: ${formatNumber(
                            p.balanceAdded || 0,
                        )}\n- ${texts.c.u} Lost: ${formatNumber(
                            p.balanceRemove || 0,
                        )}`,
                    ]
                        .map((c) => `${customEmoji.a.z_info} ${c}`)
                        .join("\n"),
                    color: member?.displayColor || 0xff000,
                    author: {
                        name: user.tag,
                        icon_url: user.displayAvatarURL(),
                    },
                    footer: {
                        text: `ID: ${user.id}`,
                    },
                },
            ],
            files: sendFile(`extra`, {
                badges: p.badges || [],
                achievements: p.achievements || [],
                collectables: p.collectables || [],
            }).files,
        });
    },
});
