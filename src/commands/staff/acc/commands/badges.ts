import {
    buildCommand,
    getUser,
    type SubCommand,
} from "@elara-services/botbuilder";
import { awaitComponent, embedComment, noop } from "@elara-services/utils";
import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    type StringSelectMenuInteraction,
} from "discord.js";
import { roles } from "../../../../config";
import { badges as B } from "../../../../plugins/other/badges";
import { getProfileByUserId, updateUserProfile } from "../../../../services";

export const badges = buildCommand<SubCommand>({
    subCommand: (b) =>
        b
            .setName(`badges`)
            .setDescription(`Manage the badges for a user`)
            .addUserOption((o) => getUser(o, { required: true })),
    locked: { roles: roles.main },
    async execute(i, r) {
        const user = i.options.getUser("user", true);
        if (user.bot) {
            return r.edit(embedComment(`Bots don't have a profile.`));
        }
        const profile = await getProfileByUserId(user.id);
        if (!profile) {
            return r.edit(
                embedComment(
                    `I was unable to find their profile, try again later?`,
                ),
            );
        }

        const row = new ActionRowBuilder<StringSelectMenuBuilder>();
        const select = new StringSelectMenuBuilder()
            .setCustomId(`select_badges`)
            .setMinValues(1);
        for (const badge of B) {
            if (badge.type === "message") {
                continue;
            }
            for (const tier of badge.tiers) {
                select.addOptions({
                    label: `${badge.name} | ${tier.name || tier.tierId}`,
                    value: `${badge.badgeId}|${tier.tierId}`,
                    emoji: tier.emoji || undefined,
                });
            }
        }
        if (!select.options.length) {
            return r.edit(
                embedComment(
                    `There is no more available badges for this user to get.`,
                ),
            );
        }
        select.setMaxValues(select.options.length);
        row.addComponents(select);

        const sentMessage = await r.edit({
            embeds: embedComment(
                `Select the badges you want to assign to the user.`,
                "Orange",
            ).embeds,
            components: [row],
        });
        if (!sentMessage) {
            return;
        }

        const int = await awaitComponent<StringSelectMenuInteraction>(
            sentMessage,
            {
                custom_ids: [{ id: "select_badges" }],
                users: [{ allow: true, id: i.user.id }],
            },
        );
        if (!int) {
            return r.edit(embedComment(`You didn't make a selection in time!`));
        }
        await int
            .update(
                embedComment(
                    `One moment, getting the badges and adding them to the user.`,
                ),
            )
            .catch(noop);
        const results = [];
        for (const value of int.values) {
            const [badgeId, tierId] = value.split("|");
            const find = B.find(
                (c) =>
                    c.badgeId === badgeId &&
                    c.tiers.find((t) => t.tierId === tierId),
            );
            if (find) {
                const tier = find.tiers.find((c) => c.tierId === tierId);
                if (!tier) {
                    continue;
                }
                const str = `${tier.emoji} \`${find.name}\` (${
                    tier.name || tier.tierId
                })`;
                const hasBadge = profile.badges.find(
                    (c) => c.badgeId === badgeId && c.tierId === tier.tierId,
                );
                if (hasBadge) {
                    results.push(`\`❌\` ${str}`);
                    profile.badges = profile.badges.filter(
                        (c) =>
                            c.badgeId !== badgeId && c.tierId !== tier.tierId,
                    );
                } else {
                    results.push(`\`✅\` ${str}`);
                    profile.badges.push({ badgeId, tierId });
                }
            }
        }
        if (!results.length) {
            return r.edit(
                embedComment(`The user's badges didn't need to be updated.`),
            );
        }
        await updateUserProfile(user.id, { badges: profile.badges });
        return r.edit(embedComment(results.join("\n"), "Green"));
    },
});
