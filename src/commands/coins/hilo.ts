import type { SlashCommand } from "@elara-services/botbuilder";
import {
    addButtonRow,
    awaitComponent,
    embedComment,
    get,
} from "@elara-services/utils";
import { ButtonStyle, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { channels } from "../../config";
import { getProfileByUserId, handleBets, removeBalance } from "../../services";
import {
    checkBelowBalance,
    checks,
    customEmoji,
    locked,
    texts,
} from "../../utils";

export const hilo: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("hilo")
        .setDescription("Play the HiLo Game")
        .setDMPermission(false)
        .addIntegerOption((o) =>
            o
                .setRequired(true)
                .setName("bet")
                .setDescription("The amount to bet")
                .setMinValue(10)
                .setMaxValue(1000),
        ),
    defer: { silent: false },
    locked: {
        channels: [
            ...channels.gamblingcommands,
            ...channels.testingbotcommands,
        ],
    },
    async execute(interaction, responder) {
        locked.set(interaction);
        const message = await interaction.fetchReply().catch(() => null);
        if (!message) {
            locked.del(interaction.user.id);
            return;
        }
        const currentCard = getRandomCard();
        const amount = interaction.options.getInteger("bet", true);
        const p1 = await getProfileByUserId(interaction.user.id);

        if (!checkBelowBalance(responder, p1, amount)) {
            locked.del(interaction.user.id);
            return;
        }
        if (checks.limit(p1, amount)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`You've reached your daily gambling limit.`),
            );
        }
        await removeBalance(
            interaction.user.id,
            amount,
            true,
            `Via ${hilo.command.name}`,
        );

        const embed = new EmbedBuilder()
            .setTitle("Higher or Lower")
            .setColor("#FF9141")
            .setThumbnail("https://file.coffee/u/JbA-bjCCma7O45G-9ANSX.png")
            .setDescription(
                `Your bet is ${customEmoji.a.z_coins} \`${amount} ${texts.c.u}\`\nA is the lowest, and K is the highest.\nThe card is: **${currentCard}**.\n\nWill the next card be higher or lower?`,
            );

        const row = addButtonRow([
            {
                id: "hilo|higher",
                label: "Higher",
                style: ButtonStyle.Success,
            },
            {
                id: "hilo|lower",
                label: "Lower",
                style: ButtonStyle.Danger,
            },
            {
                id: "hilo|same",
                label: "Same",
                style: ButtonStyle.Secondary,
            },
        ]);

        await responder.edit({
            embeds: [embed],
            components: [row],
        });
        const i = await awaitComponent(message, {
            custom_ids: [{ id: `hilo|`, includes: true }],
            users: [{ allow: true, id: interaction.user.id }],
            time: get.secs(30),
        });
        if (!i) {
            locked.del(interaction.user.id);
            const resultEmbed = new EmbedBuilder()
                .setTitle("Hi-Lo Result")
                .setThumbnail("https://file.coffee/u/JbA-bjCCma7O45G-9ANSX.png")
                .setDescription(
                    `You took too long to make a choice. You lost ${customEmoji.a.z_coins} \`${amount} ${texts.c.u}\`.`,
                )
                .setColor("#FF0000");

            return responder.edit({
                embeds: [resultEmbed],
                components: [],
            });
        }
        await i.update({ components: [] }).catch(() => null);

        const userChoice = i.customId.split("|")[1];
        const nextCard = getRandomCard();

        const currentCardValue = getCardValue(currentCard);
        const nextCardValue = getCardValue(nextCard);

        // Check if the user's choice is correct
        let isCorrect = false;
        if (
            (userChoice === "higher" && nextCardValue > currentCardValue) ||
            (userChoice === "lower" && nextCardValue < currentCardValue) ||
            (userChoice === "same" && nextCardValue === currentCardValue)
        ) {
            isCorrect = true;
        }

        const resultEmbed = new EmbedBuilder()
            .setTitle("Hi-Lo Result")
            .setThumbnail("https://file.coffee/u/JbA-bjCCma7O45G-9ANSX.png")
            .setDescription(
                `**Original Card:** ${currentCard}\n**Your Choice:** \`${userChoice}\`\n**Next Card:** ${nextCard}\n\n${
                    isCorrect
                        ? `You won and earned ${
                              customEmoji.a.z_coins
                          } \`${Math.floor(amount * 1.25)} ${texts.c.u}\`!`
                        : `You lost ${customEmoji.a.z_coins} \`${amount} ${texts.c.u}\`.`
                }`,
            )
            .setColor(isCorrect ? "#00FF00" : "#FF0000");

        if (isCorrect) {
            const increment = Math.floor(amount * 1.25);
            await Promise.all([
                handleBets(
                    interaction.user.id,
                    increment,
                    amount,
                    `Via ${hilo.command.name}`,
                ),
                checks.set(p1, Math.floor(amount * 1.25)),
            ]);
        }
        locked.del(interaction.user.id);
        return await i
            .editReply({
                embeds: [resultEmbed],
                components: [],
            })
            .catch(() => null);
    },
};

function getRandomCard() {
    const suits = ["♠️", "♥️", "♦️", "♣️"];
    const cardValues = [
        "A",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
    ];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomValue =
        cardValues[Math.floor(Math.random() * cardValues.length)];
    return `${randomValue}${randomSuit}`;
}

function getCardValue(card: string) {
    const cardValues: Record<string, number> = {
        "A♠️": 1,
        "2♠️": 2,
        "3♠️": 3,
        "4♠️": 4,
        "5♠️": 5,
        "6♠️": 6,
        "7♠️": 7,
        "8♠️": 8,
        "9♠️": 9,
        "10♠️": 10,
        "J♠️": 11,
        "Q♠️": 12,
        "K♠️": 13,
        "A♥️": 1,
        "2♥️": 2,
        "3♥️": 3,
        "4♥️": 4,
        "5♥️": 5,
        "6♥️": 6,
        "7♥️": 7,
        "8♥️": 8,
        "9♥️": 9,
        "10♥️": 10,
        "J♥️": 11,
        "Q♥️": 12,
        "K♥️": 13,
        "A♦️": 1,
        "2♦️": 2,
        "3♦️": 3,
        "4♦️": 4,
        "5♦️": 5,
        "6♦️": 6,
        "7♦️": 7,
        "8♦️": 8,
        "9♦️": 9,
        "10♦️": 10,
        "J♦️": 11,
        "Q♦️": 12,
        "K♦️": 13,
        "A♣️": 1,
        "2♣️": 2,
        "3♣️": 3,
        "4♣️": 4,
        "5♣️": 5,
        "6♣️": 6,
        "7♣️": 7,
        "8♣️": 8,
        "9♣️": 9,
        "10♣️": 10,
        "J♣️": 11,
        "Q♣️": 12,
        "K♣️": 13,
    };
    return cardValues[card];
}
