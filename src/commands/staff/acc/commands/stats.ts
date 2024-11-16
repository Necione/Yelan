import { EmbedBuilder } from "@discordjs/builders";
import { buildCommand } from "@elara-services/botbuilder";
import {
    colors,
    embedComment,
    field,
    formatNumber,
    getKeys,
    is,
    proper,
} from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { roles } from "../../../../config";
import { getAllUserProfiles } from "../../../../services";
import { getAmount } from "../../../../utils";

export const stats = buildCommand({
    subCommand: (b) =>
        b.setName(`stats`).setDescription(`[ADMIN]: View profile stats`),
    locked: {
        roles: roles.main,
    },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const dbs = await getAllUserProfiles();
        if (!is.array(dbs)) {
            return r.edit(embedComment(`Unable to find any user profiles.`));
        }
        const stats = {
            genshin_uid: 0,
            star_rail_uid: 0,
            backgrounds: 0,
            achievements: 0,
            collectables: 0,
            balance: 0,
            frames: 0,
            hidden: 0,
            locked: 0,
            lemons: 0,
            messages: 0,
            rep: 0,
            trivia_points: 0,
            vault: 0,
            strikes: 0,
        };
        const inc = (name: keyof typeof stats, amount = 1) => {
            stats[name] = Math.floor(stats[name] + Math.floor(amount));
        };
        for (const db of dbs) {
            if (is.number(db.lemon)) {
                inc("lemons", db.lemon);
            }
            if (is.number(db.vault)) {
                inc("vault", db.vault);
            }
            if (is.number(db.messagesSent)) {
                inc("messages", db.messagesSent);
            }
            if (is.number(db.triviaPoints)) {
                inc("trivia_points", db.triviaPoints);
            }
            if (is.number(db.strikes)) {
                inc("strikes", db.strikes);
            }

            if (is.number(db.staffCredits)) {
                inc("rep", db.staffCredits);
            }
            if (is.number(db.rankedUID)) {
                inc("genshin_uid");
            }
            if (is.number(db.starrail)) {
                inc("star_rail_uid");
            }
            if (is.string(db.backgroundUrl)) {
                inc("backgrounds");
            }
            if (is.array(db.achievements)) {
                inc("achievements", db.achievements.length);
            }
            if (is.array(db.collectables)) {
                inc("collectables", db.collectables.length);
            }
            if (is.number(db.balance)) {
                inc("balance", db.balance);
            }
            if (is.string(db.frameUrl)) {
                inc("frames");
            }
            if (db.hidden) {
                inc("hidden");
            }
            if (db.locked) {
                inc("locked");
            }
        }
        return r.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Profile Stats`)
                    .setDescription(
                        getKeys(stats)
                            .map(
                                (c) =>
                                    `${customEmoji.a.z_arrow_branch} \`${proper(
                                        c,
                                    )}\`: **${
                                        ["balance", "vault"].includes(c)
                                            ? getAmount(stats[c])
                                            : formatNumber(stats[c])
                                    }**`,
                            )
                            .join("\n"),
                    )
                    .setColor(colors.cyan)
                    .setAuthor({
                        name: i.guild.name,
                        iconURL: i.guild.iconURL() as string,
                    })
                    .addFields([
                        field(
                            `\u200b`,
                            `${
                                customEmoji.a.z_info
                            } Total Profiles: ${formatNumber(dbs.length)}`,
                        ),
                    ]),
            ],
        });
    },
});
