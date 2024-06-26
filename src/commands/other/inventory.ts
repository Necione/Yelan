import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import {
    addButtonRow,
    embedComment,
    formatNumber,
    get,
    getInteractionResponder,
    is,
    time,
} from "@elara-services/utils";
import { type PaginatedMessagePage } from "@sapphire/discord.js-utilities";
import {
    ButtonStyle,
    Colors,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { mainServerId } from "../../config";
import {
    checkBalanceForLimit,
    getProfileByUserId,
    updateUserProfile,
} from "../../services";
import { getCollectables } from "../../services/bot";
import { customEmoji, getPaginatedMessage, logs, texts } from "../../utils";

export const inventory = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`inventory`)
        .setDescription(`View your inventory of cards`)
        .setDMPermission(false)
        .addStringOption((o) =>
            o
                .setName(`search`)
                .setDescription(`What do you want to search for?`)
                .setRequired(false),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.channel || !i.inCachedGuild()) {
            return;
        }
        // Defer
        const originalMessage = await i.fetchReply().catch(() => null);
        if (!originalMessage) {
            return;
        }
        const search = i.options.getString("search", false) || null;

        const p = await getProfileByUserId(i.user.id);
        if (!is.array(p.collectables)) {
            return r.edit(
                embedComment(
                    `You've got nothing in your inventory...\nWait for a card to drop and pick it up!`,
                ),
            );
        }
        let networth = 0;

        const pager = getPaginatedMessage();
        const pages: PaginatedMessagePage[] = [];
        const collectable = await getCollectables(mainServerId);
        for (const c of p.collectables) {
            if (is.string(search)) {
                if (!c.name.toLowerCase().includes(search.toLowerCase())) {
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
                                                        .setCustomId("amount")
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
                                    .catch(() => null);
                                const collect = await context.interaction
                                    .awaitModalSubmit({ time: 35000 })
                                    .catch(() => null);
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
                                    collect.fields.getTextInputValue("amount"),
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
                                    .catch(() => null);
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
                                    .catch(() => null);
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
                                const priceTotal = Math.floor(find.price * 1);
                                await originalMessage
                                    .edit({ components: [] })
                                    .catch(() => null);
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
                                    .catch(() => null);
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

        async function handleSellItem(
            c: any,
            name: string,
            total: number,
            amount: number,
        ) {
            await c.deferUpdate().catch(() => null);
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
                return c.editReply(embedComment(r.message)).catch(() => null);
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
                                value: `${customEmoji.a.z_coins} \`${total} ${texts.c.u}\``,
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
                .catch(() => null);
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
                            )}\n- Net Worth: ${
                                customEmoji.a.z_coins
                            } \`${formatNumber(networth)} ${texts.c.u}\`${
                                search ? `\n- Search: ${search}` : ""
                            }`,
                        )
                        .setFooter({
                            text: `To view your Cards, use the buttons below`,
                        }),
                ],
            },
            ...pages,
        );

        return pager.run(i, i.user).catch(() => null);
    },
});
