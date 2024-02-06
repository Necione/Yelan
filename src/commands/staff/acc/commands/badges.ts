import { buildCommand, type SubCommand } from "@elara-services/botbuilder";
import { awaitComponent, embedComment, log } from "@elara-services/utils";
import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    type StringSelectMenuInteraction,
} from "discord.js";
import { roles } from "../../../../config";
import { badges as B } from "../../../../plugins/other/badges";
import { getProfileByUserId, updateUserProfile } from "../../../../services";
import { getUser } from "../../../../utils";

export const badges = buildCommand<SubCommand>({
    subCommand: (b) =>
        b
            .setName(`badges`)
            .setDescription(`Manage the badges for a user`)
            .addUserOption((o) => getUser(o, { required: true })),
    locked: { roles: roles.main },
    async execute(i) {
        const user = i.options.getUser("user", true);
        if (user.bot) {
            return i
                .editReply(embedComment(`Bots don't have a profile.`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        const profile = await getProfileByUserId(user.id);
        if (!profile) {
            return i
                .editReply(
                    embedComment(
                        `I was unable to find their profile, try again later?`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
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
            return i
                .editReply(
                    embedComment(
                        `There is no more available badges for this user to get.`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        select.setMaxValues(select.options.length);
        row.addComponents(select);

        const sentMessage = await i
            .editReply({
                embeds: embedComment(
                    `Select the badges you want to assign to the user.`,
                    "Orange",
                ).embeds,
                components: [row],
            })
            .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
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
            return i
                .editReply(embedComment(`You didn't make a selection in time!`))
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        await int
            .update(
                embedComment(
                    `One moment, getting the badges and adding them to the user.`,
                ),
            )
            .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
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
            return i
                .editReply(
                    embedComment(
                        `The user's badges didn't need to be updated.`,
                    ),
                )
                .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
        }
        await updateUserProfile(user.id, { badges: profile.badges });
        return i
            .editReply(embedComment(results.join("\n"), "Green"))
            .catch((e) => log(`[${this.subCommand.name}]: ERROR`, e));
    },
});
