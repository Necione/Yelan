import type { SlashCommand } from "@elara-services/botbuilder";
import {
    addButtonRow,
    embedComment,
    formatNumber,
    get,
    getInteractionResponder,
    is,
} from "@elara-services/utils";
import type { APIEmbedField } from "discord.js";
import {
    ButtonStyle,
    Colors,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { addBalance, getProfileByUserId, removeBalance } from "../../services";
import {
    checkBelowBalance,
    checks,
    customEmoji,
    locked,
    texts,
    userLockedData,
} from "../../utils";
const add = (label: string, emoji: string, extraId?: string) => ({
    id: `rps${extraId ? `:${extraId}` : ""}:${emoji}`,
    label,
    emoji: { name: emoji },
    style: ButtonStyle.Secondary,
});
const author = (name?: string) => ({
    name: `RPS${name || ""}`,
    iconURL: `https://cdn.discordapp.com/emojis/1090830675210420274.gif`,
});
export const winConditions = {
    "🪨": "✂️",
    "📃": "🪨",
    "✂️": "📃",
};

export const rps: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName(`rps`)
        .setDescription(`Play rock, paper, scissors.`)
        .setDMPermission(false)
        .addUserOption((o) =>
            o.setRequired(true).setName("user").setDescription("What user?"),
        )
        .addIntegerOption((o) =>
            o
                .setRequired(true)
                .setName("amount")
                .setDescription("The amount")
                .setMinValue(1)
                .setMaxValue(250),
        ),
    defer: { silent: false },
    async execute(interaction, responder) {
        if (!interaction.deferred) {
            return;
        }
        locked.set(interaction);
        const user = interaction.options.getUser("user", true);
        if (user.bot) {
            removeTimeout();
            return responder.edit(
                embedComment(`Unable to find that user or the user is a bot.`),
            );
        }
        if (interaction.user.id === user.id) {
            removeTimeout();
            return responder.edit(
                embedComment(`Pick someone else, you can't choose yourself.`),
            );
        }

        locked.set(user, interaction.commandName);

        function removeTimeout() {
            if (user) {
                locked.del([interaction.user.id, user.id]);
            } else {
                locked.del(interaction.user.id);
            }
        }
        const amount = interaction.options.getInteger("amount", true);
        const [p1, p2] = await Promise.all(
            [interaction.user.id, user.id].map((c) => getProfileByUserId(c)),
        );
        if (p1.locked) {
            removeTimeout();
            return responder.edit(userLockedData(interaction.user.id));
        }
        if (p2.locked) {
            removeTimeout();
            return responder.edit(userLockedData(user.id));
        }

        if (
            !checkBelowBalance(responder, p1, amount) ||
            !checkBelowBalance(responder, p2, amount)
        ) {
            return removeTimeout();
        }
        if (checks.limit(p1, amount)) {
            removeTimeout();
            return responder.edit(
                embedComment(`You've reached your daily coin earning limit.`),
            );
        }
        if (checks.limit(p2, amount)) {
            removeTimeout();
            return responder.edit(
                embedComment(`You've reached your daily coin earning limit.`),
            );
        }

        const selects: Record<string, string | null> = {
            [interaction.user.id]: null,
            [user.id]: null,
        };
        const e = new EmbedBuilder()
            .setAuthor(author())
            .setColor(Colors.Aqua)
            .addFields({
                name: "\u200b",
                value: `${customEmoji.a.z_coins} \`${formatNumber(amount)} ${
                    texts.c.u
                }\``,
            });
        const message = await responder.edit(
            getMainEmbed(
                interaction.user.id,
                user.id,
                e.data.fields || [],
                undefined,
                selects,
            ),
        );
        if (!message) {
            console.log(`Unable to edit the main message`);
            removeTimeout();
            return;
        }
        await removeBalance(
            interaction.user.id,
            amount,
            false,
            `Via ${rps.command.name}`,
        );

        const collector = message.createMessageComponentCollector({
            filter: (i) =>
                [user.id, interaction.user.id].includes(i.user.id) &&
                i.isButton() &&
                i.customId.startsWith("rps:"),
            time: get.secs(15),
        });

        collector.on("collect", async (i) => {
            // @ts-ignore
            const r = getInteractionResponder(i);
            if (selects[i.user.id]) {
                return void r.reply({
                    ephemeral: true,
                    ...embedComment(
                        `You've already selected, wait for your opponent`,
                    ),
                });
            }
            selects[i.user.id] = i.customId.split(":")[1];
            if (selects[interaction.user.id] && selects[user.id]) {
                collector.stop("both_selected");
            }
            getDisplayRes(interaction.user.id, user.id, e, undefined, selects);
            await responder.edit({ embeds: [e] });
            return void r.reply({
                ...embedComment(
                    `Choice selected, wait for your opponent to select!`,
                ),
                ephemeral: true,
            });
        });

        collector.on("end", async (_, reason) => {
            removeTimeout();
            if (reason === "both_selected") {
                const one = selects[interaction.user.id];
                const two = selects[user.id];
                if (one === two) {
                    await addBalance(
                        interaction.user.id,
                        amount,
                        false,
                        `Via ${rps.command.name}`,
                    );
                    await checks.set(p1, amount);
                    return void responder.edit(
                        embedComment(
                            `It's a tie!\nThe amount has been returned to ${interaction.user.toString()}`,
                        ),
                    );
                }

                if (winConditions[two as keyof typeof winConditions] !== one) {
                    await addBalance(
                        interaction.user.id,
                        amount * 2,
                        false,
                        `Via ${rps.command.name}`,
                    );
                    await checks.set(p1, amount * 2);
                    await removeBalance(
                        user.id,
                        amount,
                        false,
                        `Via ${rps.command.name}`,
                    );
                    getDisplayRes(
                        interaction.user.id,
                        user.id,
                        e,
                        interaction.user.id,
                        selects,
                    );
                    e.setAuthor(author(`: Game Over!`)).setFooter({
                        text: `${interaction.user.username} got ${formatNumber(
                            amount,
                        )} ${texts.c.u}, ${user.username} lost ${formatNumber(
                            amount,
                        )} ${texts.c.u}`,
                    });
                    return void responder.edit({
                        embeds: [e],
                        components: [],
                    });
                } else {
                    await addBalance(
                        user.id,
                        amount,
                        false,
                        `Via ${rps.command.name}`,
                    );
                    await checks.set(p2, amount);
                    getDisplayRes(
                        interaction.user.id,
                        user.id,
                        e,
                        user.id,
                        selects,
                    );
                    e.setAuthor(author(`: Game over!`)).setFooter({
                        text: `${user.username} got ${formatNumber(amount)} ${
                            texts.c.u
                        }, ${interaction.user.username} lost ${formatNumber(
                            amount,
                        )} ${texts.c.u}`,
                    });
                    return void responder.edit({
                        embeds: [e],
                        components: [],
                    });
                }
            } else {
                await addBalance(
                    interaction.user.id,
                    amount,
                    false,
                    `Via ${rps.command.name}`,
                );
                await checks.set(p1, amount);
                return void responder.edit(
                    embedComment(
                        `One of you took too long to respond, the game is now voided.`,
                    ),
                );
            }
        });
    },
};

export function getDisplayRes(
    one: string,
    two: string,
    e: EmbedBuilder,
    winner?: string,
    selects: Record<string, string | null> = {},
) {
    const getField = (u: string): string => {
        return `**[${
            selects[u]
                ? winner
                    ? selects[u]
                    : "✅"
                : customEmoji.a.questionMark
        }]:** <@${u}>${
            winner === u ? " 👑" : winner === "tie" ? " (Tie)" : ""
        }`;
    };
    return e.setDescription(`${getField(one)}\n${getField(two)}`);
}

export function getMainEmbed(
    one: string,
    two: string,
    fields?: APIEmbedField[],
    extraId = "",
    selects: Record<string, string | null> = {},
) {
    const embed = new EmbedBuilder().setAuthor(author()).setColor(Colors.Aqua);
    getDisplayRes(one, two, embed, undefined, selects);
    if (is.array(fields)) {
        embed.addFields(...fields);
    }
    return {
        content: `<@${one}> vs <@${two}>`,
        embeds: [
            embed.setFooter({
                text: `Once both players pick I'll announce the results!`,
            }),
        ],
        components: [
            addButtonRow([
                add(`Rock`, `🪨`, extraId),
                add(`Paper`, `📃`, extraId),
                add(`Scissors`, `✂️`, extraId),
            ]),
        ],
        allowedMentions: {
            users: [one, two],
        },
    };
}
