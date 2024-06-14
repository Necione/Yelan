import type { SlashCommand } from "@elara-services/botbuilder";
import {
    addButtonRow,
    convertiOSShit,
    dis,
    discord,
    embedComment,
    formatNumber,
    get,
    getInteractionResponder,
    is,
} from "@elara-services/utils";
import type { UserWallet } from "@prisma/client";
import {
    ButtonStyle,
    Colors,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    type User,
} from "discord.js";
import { channels, economy } from "../../config";
import { getProfileByUserId, updateUserProfile } from "../../services";
import { customEmoji, getTax, locked, texts, tradeTimeout } from "../../utils";
const prefix = "trade|";
const emojis = {
    completed: "✅",
    waiting: customEmoji.a.questionMark,
};
const deleteTraders = (users: User[]) => {
    for (const user of users) {
        tradeTimeout.delete(user.id);
    }
};

export const trade: SlashCommand = {
    locked: {
        channels: [
            channels.trades, // The command is locked to this channel only.
            "835328759577313302", // DO NOT REMOVE
        ],
    },
    command: new SlashCommandBuilder()
        .setName(`trade`)
        .setDescription(`Trade with another user.`)
        .setDMPermission(false)
        .addUserOption((o) =>
            o
                .setName("user")
                .setDescription(`What user do you want to trade with?`)
                .setRequired(true),
        ),
    defer: {
        silent: false,
    },
    execute: async (interaction, responder) => {
        if (!interaction.inCachedGuild() || !interaction.channel) {
            return;
        }
        const user = interaction.options.getUser("user", true);
        locked.set(interaction);

        if (tradeTimeout.has(interaction.user.id)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`You already have a trade in progress.`),
            );
        }
        if (user.bot) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`You can't trade with the bot.`),
            );
        }
        if (user.id === interaction.user.id) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`You can't trade with yourself.`),
            );
        }
        locked.set(user, interaction.commandName);
        if (tradeTimeout.has(user.id)) {
            locked.del([interaction.user.id, user.id]);
            return responder.edit(
                embedComment(
                    `User ${user.toString()} already has a trade in progress.`,
                ),
            );
        }
        const member = await discord.member(interaction.guild, user.id, true);
        if (!member) {
            locked.del([interaction.user.id, user.id]);
            return responder.edit(
                embedComment(
                    `I was unable to fetch ${user.toString()}'s member information.`,
                ),
            );
        }

        const [p, pp] = await Promise.all([
            getProfileByUserId(interaction.user.id),
            getProfileByUserId(user.id),
        ]);
        if (!p || !pp) {
            locked.del([interaction.user.id, user.id]);
            return responder.edit(
                embedComment(
                    `Unable to fetch your profile or ${user.toString()}'s profile.`,
                ),
            );
        }
        const allRoles = [
            ...interaction.member.roles.cache.keys(),
            ...member.roles.cache.keys(),
        ];
        const shouldTax = allRoles.includes(economy.boost.role) ? false : true;
        tradeTimeout.add(interaction.user.id).add(user.id);
        const trading: Record<
            string,
            {
                items: {
                    type: string;
                    amount: number;
                    name?: string;
                }[];
                done: boolean;
                db: UserWallet;
            }
        > = {
            [interaction.user.id]: {
                items: [],
                done: false,
                db: p,
            },
            [user.id]: {
                items: [],
                done: false,
                db: pp,
            },
        };
        const display = (id: string) => {
            const data = trading[id];
            return `<@${id}>: ${emojis[data.done ? "completed" : "waiting"]}\n`;
        };
        const embed = new EmbedBuilder()
            .setTitle(`Pending Trade`)
            .setColor(Colors.Orange)
            .setDescription(
                `${display(interaction.user.id)}None\n\n${display(
                    user.id,
                )}None`,
            );

        const updateDesc = async () => {
            const one = await Promise.all(
                trading[interaction.user.id].items.map(async (c) =>
                    c.type === texts.c.l
                        ? `+${
                              c.amount -
                              (shouldTax
                                  ? await getTax(c.amount, interaction.member)
                                  : 0)
                          } ${texts.c.u} (${
                              shouldTax
                                  ? await getTax(c.amount, interaction.member)
                                  : 0
                          } Tax)`
                        : `+${c.amount}: ${c.name}`,
                ),
            );
            const two = await Promise.all(
                trading[user.id].items.map(async (c) =>
                    c.type === texts.c.l
                        ? `+${
                              c.amount -
                              (shouldTax ? await getTax(c.amount, member) : 0)
                          } ${texts.c.u} (${
                              shouldTax ? await getTax(c.amount, member) : 0
                          } Tax)`
                        : `+${c.amount}: ${c.name}`,
                ),
            );
            return responder.edit({
                embeds: [
                    embed.setDescription(
                        `${display(interaction.user.id)}${
                            one.length
                                ? `\`\`\`diff\n${one.join("\n")}\`\`\``
                                : "None"
                        }\n\n${display(user.id)}${
                            two.length
                                ? `\`\`\`diff\n${two.join("\n")}\`\`\``
                                : "None"
                        }`,
                    ),
                ],
            });
        };

        await responder.edit({
            embeds: [embed],
            components: [
                addButtonRow([
                    {
                        label: "Add",
                        id: `${prefix}add`,
                        style: ButtonStyle.Success,
                    },
                    {
                        label: "Complete",
                        id: `${prefix}complete`,
                        style: ButtonStyle.Primary,
                    },
                    {
                        label: "Cancel",
                        id: `${prefix}cancel`,
                        style: ButtonStyle.Danger,
                    },
                ]),
            ],
        });
        const collector = interaction.channel.createMessageComponentCollector({
            time: get.mins(2),
            filter: (ii) =>
                [interaction.user.id, user.id].includes(ii.user.id) &&
                ii.customId.startsWith(prefix),
        });

        collector.on("collect", async (i) => {
            if (!dis.member(i.member)) {
                return;
            }
            // @ts-ignore
            const r = getInteractionResponder(i);
            if (i.isButton()) {
                const [, type] = i.customId.split("|");

                switch (type) {
                    case "add": {
                        if (trading[i.user.id].done) {
                            return void r.reply({
                                ...embedComment(
                                    `You've already completed the trade, wait for the other person to press 'Complete'`,
                                ),
                                ephemeral: true,
                            });
                        }
                        return void r.reply({
                            ephemeral: true,
                            components: [
                                {
                                    type: 1,
                                    components: [
                                        new StringSelectMenuBuilder()
                                            .setCustomId(`${prefix}selected`)
                                            .setMinValues(1)
                                            .setMaxValues(1)
                                            .setPlaceholder(
                                                `Select the item you want to add to the trade.`,
                                            )
                                            .addOptions(
                                                {
                                                    label: "None",
                                                    value: "none",
                                                    description:
                                                        "Set/Reset your trade to nothing.",
                                                },
                                                {
                                                    label: "Collectable",
                                                    value: "collectable",
                                                    description: `Add a Collectable to the trade.`,
                                                },
                                            ),
                                    ],
                                },
                            ],
                        });
                    }

                    case "complete": {
                        if (trading[i.user.id].done) {
                            return void r.reply({
                                ...embedComment(
                                    `You've already marked your trade as 'Complete' wait for the other user to press 'Complete'`,
                                ),
                                ephemeral: true,
                            });
                        }
                        trading[i.user.id].done = true;
                        await updateDesc();
                        await r.reply({
                            ...embedComment(
                                `You've marked your trade as Complete, just waiting on the other user to Complete the trade.`,
                                "Green",
                            ),
                            ephemeral: true,
                        });
                        if (
                            trading[interaction.user.id].done &&
                            trading[user.id].done
                        ) {
                            collector.stop("completed");
                        }
                        break;
                    }

                    case "cancel": {
                        collector.stop("cancelled");
                        break;
                    }
                }
            } else if (i.isAnySelectMenu()) {
                const [, type] = i.customId.split("|");
                const value = i.values[0];
                if (!value) {
                    return void r.update(
                        embedComment(`You didn't provide anything to change.`),
                    );
                }

                switch (type) {
                    case "selected": {
                        if (value === "collectable") {
                            await r.showModal({
                                customId: `${prefix}add|collectable`,
                                title: `Add Collectable to trade`,
                                components: [
                                    {
                                        type: 1,
                                        components: [
                                            new TextInputBuilder()
                                                .setCustomId("amount")
                                                .setLabel("Amount")
                                                .setMinLength(1)
                                                .setMaxLength(100)
                                                .setRequired(true)
                                                .setStyle(TextInputStyle.Short)
                                                .setValue("1"),
                                        ],
                                    },
                                    {
                                        type: 1,
                                        components: [
                                            new TextInputBuilder()
                                                .setCustomId("name")
                                                .setLabel("Collectable Name")
                                                .setMinLength(1)
                                                .setMaxLength(300)
                                                .setRequired(true)
                                                .setStyle(
                                                    TextInputStyle.Paragraph,
                                                ),
                                        ],
                                    },
                                ],
                            });
                        } else {
                            trading[i.user.id].items = [];
                            await updateDesc();
                            return void r.update(
                                embedComment(`Your trade is now set to 'None'`),
                            );
                        }

                        const c = await i
                            .awaitModalSubmit({
                                filter: (ii) => ii.user.id === i.user.id,
                                time: get.secs(50),
                            })
                            .catch(() => null);
                        if (!c) {
                            return void r.edit(
                                embedComment(
                                    `Didn't make a selection in time, try again.`,
                                ),
                            );
                        }
                        await c.deferUpdate().catch(() => null);
                        // @ts-ignore
                        const rr = getInteractionResponder(c);
                        const amount = parseInt(
                            c.fields
                                .getTextInputValue("amount")
                                .replace(/,/gi, ""),
                        );
                        if (!is.number(amount)) {
                            return void rr.edit(
                                embedComment(`You provided an invalid amount.`),
                            );
                        }
                        if (value === "collectable") {
                            const name = convertiOSShit(
                                c.fields.fields.find(
                                    (c) => c.customId === "name",
                                )?.value || "",
                            );
                            if (!name) {
                                return void rr.edit(
                                    embedComment(
                                        `You didn't provide a collectable name???? HOW`,
                                    ),
                                );
                            }
                            const db = trading[i.user.id].db;
                            const has = db.collectables.find(
                                (c) =>
                                    c.name.toLowerCase() === name.toLowerCase(),
                            );
                            if (!has) {
                                return void rr.edit(
                                    embedComment(
                                        `Unable to add ${name} collectable, you don't have it on your account!`,
                                    ),
                                );
                            }
                            if (amount > has.count) {
                                return void rr.edit(
                                    embedComment(
                                        `Unable to add ${amount} (${name}) collectable, you don't have that many collected!`,
                                    ),
                                );
                            }
                            const find = trading[i.user.id].items.find(
                                (c) =>
                                    c.type === "collectable" &&
                                    is.string(c.name) &&
                                    c.name.toLowerCase() === name.toLowerCase(),
                            );
                            if (!find) {
                                trading[i.user.id].items.push({
                                    type: "collectable",
                                    name: has.name,
                                    amount,
                                });
                                await updateDesc();
                                rr.deleteReply(get.secs(3));
                                return void rr.edit(
                                    embedComment(
                                        `Added \`${has.name}\` (${amount}) collectable to the trade.`,
                                        "Green",
                                    ),
                                );
                            }
                            return void rr.edit(
                                embedComment(
                                    `Nothing needed to be added to the trade.`,
                                ),
                            );
                        }
                        break;
                    }
                }
            }
        });

        collector.on("end", async (_, reason) => {
            if (!reason || reason !== "completed") {
                locked.del([interaction.user.id, user.id]);
                deleteTraders([interaction.user, user]);
                return void responder.edit(
                    embedComment(
                        `One of the users has cancelled the trade, no items have changed hands.`,
                    ),
                );
            }
            await responder.edit(embedComment(`One moment...`, "Orange"));
            const one = trading[interaction.user.id];
            const two = trading[user.id];
            const changed: Record<string, string[]> = {
                [interaction.user.id]: [],
                [user.id]: [],
            };
            if (is.array(two.items)) {
                const u = await getProfileByUserId(interaction.user.id);
                if (u) {
                    const uu = {
                        balance: 0,
                        collectables: [] as { name: string; count: number }[],
                    };
                    for await (const item of two.items) {
                        if (
                            item.type === "collectable" &&
                            is.string(item.name)
                        ) {
                            const find = u.collectables.find(
                                (c) =>
                                    c.name.toLowerCase() ===
                                    item.name?.toLowerCase(),
                            );
                            if (find) {
                                uu.collectables.push({
                                    name: item.name,
                                    count: item.amount,
                                });
                                find.count = Math.floor(
                                    find.count + item.amount,
                                );
                                changed[interaction.user.id].push(
                                    `+${item.amount}: ${item.name}`,
                                );
                            } else {
                                u.collectables.push({
                                    name: item.name,
                                    count: item.amount,
                                });
                                uu.collectables.push({
                                    name: item.name,
                                    count: item.amount,
                                });
                                changed[interaction.user.id].push(
                                    `+${item.amount}: ${item.name}`,
                                );
                            }
                        }
                    }
                    if (uu.balance || is.array(uu.collectables)) {
                        const up = await getProfileByUserId(user.id);
                        if (uu.balance) {
                            up.balance = Math.floor(up.balance - uu.balance);
                        }
                        if (is.array(uu.collectables)) {
                            for (const cc of uu.collectables) {
                                const find = up.collectables.find(
                                    (c) => c.name === cc.name,
                                );
                                if (find) {
                                    find.count = Math.floor(
                                        find.count - cc.count,
                                    );
                                    if (find.count <= 0) {
                                        up.collectables =
                                            up.collectables.filter(
                                                (c) => c.name !== cc.name,
                                            );
                                    }
                                }
                            }
                        }
                        await updateUserProfile(user.id, {
                            balance: {
                                set: up.balance,
                            },
                            collectables: {
                                set: up.collectables,
                            },
                        });
                    }
                    if (is.array(changed[interaction.user.id])) {
                        await updateUserProfile(interaction.user.id, {
                            balance: { set: u.balance },
                            collectables: { set: u.collectables },
                        });
                    }
                }
            }

            if (is.array(one.items)) {
                const u = await getProfileByUserId(user.id);
                if (u) {
                    const uu = {
                        balance: 0,
                        collectables: [] as { name: string; count: number }[],
                    };
                    for await (const item of one.items) {
                        if (item.type === texts.c.l) {
                            uu.balance = item.amount;
                            const tax = shouldTax
                                ? await getTax(item.amount, member)
                                : 0;
                            item.amount = Math.floor(item.amount - tax);
                            u.balance = Math.floor(u.balance + item.amount);
                            changed[user.id].push(
                                `+${formatNumber(item.amount)} ${texts.c.u}`,
                            );
                        } else if (
                            item.type === "collectable" &&
                            is.string(item.name)
                        ) {
                            const find = u.collectables.find(
                                (c) =>
                                    c.name.toLowerCase() ===
                                    item.name?.toLowerCase(),
                            );
                            if (find) {
                                uu.collectables.push({
                                    name: item.name,
                                    count: item.amount,
                                });
                                find.count = Math.floor(
                                    find.count + item.amount,
                                );
                                changed[user.id].push(
                                    `+${item.amount}: ${item.name}`,
                                );
                            } else {
                                u.collectables.push({
                                    name: item.name,
                                    count: item.amount,
                                });
                                uu.collectables.push({
                                    name: item.name,
                                    count: item.amount,
                                });
                                changed[user.id].push(
                                    `+${item.amount}: ${item.name}`,
                                );
                            }
                        }
                    }
                    if (uu.balance || is.array(uu.collectables)) {
                        const up = await getProfileByUserId(
                            interaction.user.id,
                        );
                        if (uu.balance) {
                            up.balance = Math.floor(up.balance - uu.balance);
                        }
                        if (is.array(uu.collectables)) {
                            for (const cc of uu.collectables) {
                                const find = up.collectables.find(
                                    (c) => c.name === cc.name,
                                );
                                if (find) {
                                    find.count = Math.floor(
                                        find.count - cc.count,
                                    );
                                    if (find.count <= 0) {
                                        up.collectables =
                                            up.collectables.filter(
                                                (c) => c.name !== cc.name,
                                            );
                                    }
                                }
                            }
                        }
                        await updateUserProfile(interaction.user.id, {
                            balance: { set: up.balance },
                            collectables: { set: up.collectables },
                        });
                    }
                    if (is.array(changed[user.id])) {
                        await updateUserProfile(user.id, {
                            balance: { set: u.balance },
                            collectables: { set: u.collectables },
                        });
                    }
                }
            }
            locked.del([interaction.user.id, user.id]);
            deleteTraders([interaction.user, user]);
            if (
                !is.array(changed[interaction.user.id]) &&
                !is.array(changed[user.id])
            ) {
                return void responder.edit(
                    embedComment(`Nothing needed to be traded.`),
                );
            }
            embed
                .setDescription(
                    `${display(interaction.user.id)}${
                        changed[interaction.user.id].length
                            ? `\`\`\`diff\n${changed[interaction.user.id].join(
                                  "\n",
                              )}\`\`\``
                            : "None"
                    }\n\n${display(user.id)}${
                        changed[user.id].length
                            ? `\`\`\`diff\n${changed[user.id].join("\n")}\`\`\``
                            : "None"
                    }`,
                )
                .setTitle(`Trade Completed!`)
                .setColor(Colors.Green);
            await discord.messages.send({
                client: interaction.client,
                channelId: channels.transactions.log,
                options: {
                    embeds: [embed],
                },
            });
            return void responder.edit({
                embeds: [embed],
                components: [],
            });
        });
    },
};
