import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import {
    chunk,
    embedComment,
    formatNumber,
    is,
    noop,
} from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import type { UserWallet } from "@prisma/client";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { mainServerId } from "../../config";
import { getAllUserProfiles, getProfileByUserId } from "../../services";
import { getCollectables } from "../../services/bot";
import { getPaginatedMessage, getRandomImage } from "../../utils";

export const cards = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`cards`)
        .setDescription(`Show the current list of cards`)
        .setDMPermission(false)
        .addBooleanOption((o) =>
            o
                .setName(`me`)
                .setDescription(
                    `Do you want to show your cards only? (default: False)`,
                )
                .setRequired(false),
        )
        .addStringOption((o) =>
            o
                .setName(`type`)
                .setDescription(`Which type?`)
                .setRequired(false)
                .addChoices(
                    { name: "Show base price (default)", value: "per_value" },
                    { name: "Show total price", value: "value" },
                ),
        )
        .addStringOption((o) =>
            o
                .setName(`search`)
                .setDescription(`What's the collectable name?`)
                .setRequired(false),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const me = i.options.getBoolean("me", false) || false;
        const type = (i.options.getString("type", false) || "per_value") as
            | "value"
            | "per_value";
        const search = i.options.getString("search", false) || null;
        let profiles: UserWallet[];
        if (me) {
            const p = await getProfileByUserId(i.user.id);
            if (!is.array(p.collectables)) {
                return r.edit(embedComment(`You have no cards to display.`));
            }
            profiles = [p];
        } else {
            profiles = await getAllUserProfiles({
                where: {
                    collectables: {
                        isEmpty: false,
                    },
                },
            });
        }
        if (!is.array(profiles)) {
            return r.edit(embedComment(`There is no profiles that has cards?`));
        }
        let list: {
            name: string;
            count: number;
            value: number;
            per_value: number;
        }[] = [];
        const flat = profiles.flatMap((c) => c.collectables);
        const collectable = await getCollectables(mainServerId);

        for (const fl of flat) {
            const cc = collectable?.items.find((r) => r.name === fl.name);
            if (!cc) {
                continue;
            }
            const f = list.find((c) => c.name === fl.name);
            if (f) {
                f.count = Math.floor(f.count + fl.count);
                f.value = Math.floor(f.value + Math.floor(cc.price * fl.count));
            } else {
                list.push({
                    ...fl,
                    value: Math.floor(cc.price * fl.count),
                    per_value: cc.price,
                });
            }
        }
        const embed = new EmbedBuilder()
            .setTitle(`${me ? "Your " : ""}Total Cards`)
            .setColor(0xc0f6fb)
            .setImage(getRandomImage());

        if (is.string(search)) {
            const find = list.filter((c) =>
                c.name.toLowerCase().includes(search.toLowerCase()),
            );
            if (!is.array(find)) {
                return r.edit(
                    embedComment(
                        `Unable to find anything that matches (${search.toLowerCase()}) query.`,
                    ),
                );
            }
            list = find;
        }
        const pager = getPaginatedMessage();
        if (me) {
            embed.setAuthor({
                name: i.user.displayName,
                iconURL: i.user.displayAvatarURL(),
            });
        }
        const pages = chunk(
            list
                .sort((a, b) => b.count - a.count)
                .map(
                    (c) =>
                        `[**${formatNumber(c.count)}x**]: \`${c.name}\` | ${
                            customEmoji.a.z_coins
                        } **${formatNumber(c[type])} ${texts.c.u}**`,
                ),
            10,
        );

        if (pages.length === 1) {
            embed.setDescription(pages[0].join("\n"));
            return r.edit({ embeds: [embed] });
        } else {
            for (const page of pages) {
                const em = EmbedBuilder.from(embed);
                em.setDescription(page.join("\n"));
                pager.addPageEmbed(em);
            }
            return pager.run(i, i.user).catch(noop);
        }
    },
});
