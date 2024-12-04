import {
    addButtonRow,
    embedComment,
    formatNumber,
    get,
    getInteractionResponder,
    is,
    make,
    noop,
    time,
} from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import type { UserWallet } from "@prisma/client";
import type { PaginatedMessagePage } from "@sapphire/discord.js-utilities";
import {
    type AnySelectMenuInteraction,
    ButtonStyle,
    Colors,
    ComponentType,
    EmbedBuilder,
    type InteractionEditReplyOptions,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    type User,
} from "discord.js";
import { inventory } from "../../commands";
import { mainServerId } from "../../config";
import {
    checkBalanceForLimit,
    getProfileByUserId,
    updateUserProfile,
} from "../../services";
import { getCollectables } from "../../services/bot";
import {
    getAmount,
    getPaginatedMessage,
    logs,
    userLockedData,
} from "../../utils";
import { isOriginalMessageUser } from "./invites";

export async function onInventoryInteraction(i: AnySelectMenuInteraction) {
    const [value, search] = i.values[0].split("|");
    const r = getInteractionResponder(i);
    if (!isOriginalMessageUser(i)) {
        return r.reply({
            ephemeral: true,
            ...embedComment(`You're not the original message author.`),
        });
    }
    await r.deferUpdate();
    const p = await getProfileByUserId(i.user.id);
    if (!p) {
        return r.edit(embedComment(`Unable to find/create your user profile.`));
    }
    if (p.locked) {
        return r.edit(userLockedData(i.user.id));
    }
    const select = getSelectMenu(value, search);
    switch (value.toLowerCase()) {
        case "cards": {
            const originalMessage = await i.fetchReply().catch(noop);
            if (!originalMessage) {
                return r.edit(
                    embedComment(`Unable to fetch the original message.`),
                );
            }
            if (!is.array(p.collectables)) {
                return r.edit(
                    embedComment(
                        `You've got nothing in your inventory...\nWait for a card to drop and pick it up!`,
                    ),
                );
            }
            let networth = 0;
            const s = [null, "null"].includes(search) ? null : search;

            const pager = getPaginatedMessage();
            const pages = make.array<PaginatedMessagePage>();
            const collectable = await getCollectables(mainServerId);
            for (const c of p.collectables) {
                if (is.string(s)) {
                    if (!c.name.toLowerCase().includes(s.toLowerCase())) {
                        continue;
                    }
                }
                const find = collectable?.items.find((r) => r.name === c.name);
                if (!find) {
                    continue;
                }
                networth = Math.floor(networth + find.price * c.count);
                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: i.user.username,
                        iconURL: i.user.displayAvatarURL(),
                    })
                    .setTitle(`Collectables`)
                    .setColor(0xc0f6fb)
                    .setDescription(
                        `- Name: ${c.name}\n- Rarity: ${
                            find.rarity || "Normal"
                        }\n- Price: \`${find.price} ${
                            texts.c.u
                        }\`\n- Collected: ${formatNumber(
                            c.count,
                        )}\n- Duplicates: ${formatNumber(c.count - 1)}`,
                    )
                    .setImage(find.image || null);
                pages.push({
                    embeds: [embed],
                    actions: [
                        {
                            customId: `sell|${c.name}`,
                            style: ButtonStyle.Success,
                            type: ComponentType.Button,
                            label: `Sell`,
                            async run(context) {
                                const r = getInteractionResponder(
                                    context.interaction,
                                );
                                const showConfirm = (amount = 1) => {
                                    return addButtonRow([
                                        {
                                            id: `confirm`,
                                            label: `Confirm to sell ${amount}`,
                                            style: ButtonStyle.Success,
                                        },
                                        {
                                            id: `cancel`,
                                            label: "Cancel",
                                            style: ButtonStyle.Danger,
                                        },
                                    ]);
                                };
                                if (c.count > 1) {
                                    await context.interaction
                                        .showModal({
                                            custom_id: `sell`,
                                            title: `Sell Multiple ${c.name}`.slice(
                                                0,
                                                100,
                                            ),
                                            components: [
                                                {
                                                    type: 1,
                                                    components: [
                                                        new TextInputBuilder()
                                                            .setCustomId(
                                                                "amount",
                                                            )
                                                            .setLabel("Amount")
                                                            .setStyle(
                                                                TextInputStyle.Short,
                                                            )
                                                            .setMinLength(1)
                                                            .setMaxLength(5)
                                                            .setRequired(true)
                                                            .toJSON(),
                                                    ],
                                                },
                                            ],
                                        })
                                        .catch(noop);
                                    const collect = await context.interaction
                                        .awaitModalSubmit({
                                            time: get.secs(35),
                                        })
                                        .catch(noop);
                                    if (!collect) {
                                        return;
                                    }
                                    const rr = getInteractionResponder(collect);
                                    const msg = await rr.defer({
                                        ephemeral: true,
                                        fetchReply: true,
                                    });
                                    if (!msg) {
                                        return;
                                    }
                                    const amount = parseInt(
                                        collect.fields.getTextInputValue(
                                            "amount",
                                        ),
                                    );
                                    if (!is.number(amount)) {
                                        return rr.edit(
                                            embedComment(
                                                `The amount you provided is invalid, please try another one.`,
                                            ),
                                        );
                                    }
                                    if (amount > c.count) {
                                        return rr.edit(
                                            embedComment(
                                                `The amount you provided is above the amount you have available.`,
                                            ),
                                        );
                                    }
                                    const priceTotal = Math.floor(
                                        find.price * amount,
                                    );
                                    await originalMessage
                                        .edit({ components: [] })
                                        .catch(noop);
                                    await rr.edit({
                                        embeds: embedComment(
                                            `Are you sure you want to sell (${amount}) ${
                                                c.name
                                            } for \`${priceTotal} ${
                                                texts.c.u
                                            }\`?\n> You have ${time.countdown(
                                                get.secs(10),
                                            )} to decide.`,
                                            "Orange",
                                        ).embeds,
                                        components: [showConfirm(amount)],
                                    });
                                    const collected = await msg
                                        .awaitMessageComponent({
                                            time: get.secs(10),
                                        })
                                        .catch(noop);
                                    if (collected?.customId !== "confirm") {
                                        return rr.edit(
                                            embedComment(`Command Cancelled.`),
                                        );
                                    }
                                    return handleSellItem(
                                        collected,
                                        c.name,
                                        priceTotal,
                                        amount,
                                    );
                                } else {
                                    const m = await r.defer({
                                        ephemeral: true,
                                        fetchReply: true,
                                    });
                                    if (!m) {
                                        return;
                                    }
                                    const priceTotal = Math.floor(
                                        find.price * 1,
                                    );
                                    await originalMessage
                                        .edit({ components: [] })
                                        .catch(noop);
                                    await r.edit({
                                        embeds: embedComment(
                                            `Are you sure you want to sell (1) ${
                                                c.name
                                            } for \`${priceTotal} ${
                                                texts.c.u
                                            }\`?\n> You have ${time.countdown(
                                                get.secs(10),
                                            )} to decide.`,
                                            "Orange",
                                        ).embeds,
                                        components: [showConfirm(1)],
                                    });
                                    const co = await m
                                        .awaitMessageComponent({
                                            time: get.secs(10),
                                        })
                                        .catch(noop);
                                    if (co?.customId !== "confirm") {
                                        return r.edit(
                                            embedComment(`Command Cancelled.`),
                                        );
                                    }
                                    return handleSellItem(
                                        co,
                                        c.name,
                                        priceTotal,
                                        1,
                                    );
                                }
                            },
                        },
                    ],
                });
            }

            // eslint-disable-next-line no-inner-declarations
            async function handleSellItem(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                c: any,
                name: string,
                total: number,
                amount: number,
            ) {
                await c.deferUpdate().catch(noop);
                c.deferred = true;
                const profile = await getProfileByUserId(i.user.id);
                if (!profile) {
                    return;
                }
                const find = profile.collectables.find((c) => c.name === name);
                if (!find) {
                    return;
                }
                const r = checkBalanceForLimit(profile, total);
                if (!r.status) {
                    return c.editReply(embedComment(r.message)).catch(noop);
                }
                find.count = Math.floor(find.count - amount);
                if (find.count <= 0) {
                    profile.collectables = profile.collectables.filter(
                        (r) => r.name !== name,
                    );
                }
                await logs.action(
                    i.user.id,
                    total,
                    "add",
                    `Via ${inventory.command.name}`,
                );
                await updateUserProfile(i.user.id, {
                    balance: {
                        increment: total,
                    },
                    collectables: {
                        set: profile.collectables,
                    },
                });
                await logs.collectables({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({
                                name: i.user.username,
                                iconURL: i.user.displayAvatarURL(),
                            })
                            .setTitle(`💰 Sold Collectable 💰`)
                            .setColor(Colors.Aqua)
                            .addFields(
                                { name: "Name", value: name, inline: true },
                                {
                                    name: `Amount`,
                                    value: getAmount(total),
                                    inline: true,
                                },
                                {
                                    name: "Copies Left",
                                    value: `${formatNumber(find.count || 0)}`,
                                },
                            ),
                    ],
                });
                return c
                    .editReply(
                        embedComment(
                            `Sold (${amount}) \`${name}\` items for \`${total} ${texts.c.u}\``,
                            "Green",
                        ),
                    )
                    .catch(noop);
            }
            const dupes = p.collectables
                .filter((c) => c.count > 1)
                .map((c) => c.count - 1)
                .reduce((a, b) => a + b, 0);
            pager.pages.push(
                {
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xc0f6fb)
                            .setTitle(`Your Cards`)
                            .setAuthor({
                                name: i.user.username,
                                iconURL: i.user.displayAvatarURL(),
                            })
                            .setDescription(
                                `- Total: ${formatNumber(
                                    p.collectables
                                        .map((c) => c.count)
                                        .reduce((a, b) => a + b, 0),
                                )}\n- Collected: ${formatNumber(
                                    p.collectables.length,
                                )}/${formatNumber(
                                    collectable?.items?.length || 0,
                                )}\n- Duplicates: ${formatNumber(
                                    dupes,
                                )}\n- Net Worth: ${getAmount(networth)}${
                                    is.string(s) ? `\n- Search: ${s}` : ""
                                }`,
                            )
                            .setFooter({
                                text: `To view your Cards, use the buttons below`,
                            }),
                    ],
                },
                ...pages,
            );

            return pager.run(i, i.user).catch(noop);
        }
        case "vouchers": {
            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xc0f6fb)
                        .setTitle("Vouchers")
                        .setDescription("nothing found :("),
                ],
                components: [select],
            });
        }
        case "other": {
            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xc0f6fb)
                        .setTitle("Other Items")
                        .setDescription(
                            `${customEmoji.a.z_lemon} Lemon: ${formatNumber(
                                p.lemon,
                            )}`,
                        ),
                ],
                components: [select],
            });
        }
    }
}

export function getSelectMenu(def?: string | null, search?: string | null) {
    const dropdown = new StringSelectMenuBuilder()
        .setCustomId("inventory_select")
        .setPlaceholder("👛 Select an option")
        .addOptions([
            {
                label: "Cards",
                value: `cards|${search}`.slice(0, 100), // If it's above 100 characters, slice it off.
                description: "View your cards",
                default: def === "cards",
            },
            {
                label: "Other",
                value: `other|${search}`.slice(0, 100),
                description: "View other items",
                default: def === "other",
            },
            {
                label: "Vouchers",
                value: `vouchers|${search}`.slice(0, 100),
                description: "View your vouchers",
                default: def === "vouchers",
            },
        ]);
    return {
        type: ComponentType.ActionRow,
        components: [dropdown],
    };
}

export function getOriginalInventory(
    user: User,
    p: UserWallet,
    search?: string | null,
): InteractionEditReplyOptions {
    return {
        embeds: [
            new EmbedBuilder()
                .setTitle(`${user.username}'s Inventory`)
                .setColor(0x6e90ff)
                .setDescription(
                    `✏️ Please use the buttons below to navigate\n\n${[
                        `Cards: ${formatNumber(
                            p.collectables
                                .map((c) => c.count)
                                .reduce((a, b) => a + b, 0),
                        )} Total (${formatNumber(
                            p.collectables.length,
                        )} Unique)`,
                        // `Other: ??? Total`, // Unsure what needs to be added here??
                        `Lemons: ${formatNumber(p.lemon)} Total`,
                    ]
                        .map((c) => `- ${c}`)
                        .join("\n")}`,
                )
                .setThumbnail(user.displayAvatarURL()),
        ],
        components: [getSelectMenu(null, search)],
    };
}
