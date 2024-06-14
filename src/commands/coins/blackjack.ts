import type { SlashCommand } from "@elara-services/botbuilder";
import { addButtonRow, awaitComponent, get } from "@elara-services/utils";
import {
    ButtonStyle,
    Colors,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { getProfileByUserId, handleBets, removeBalance } from "../../services";
import { checkBelowBalance, customEmoji, locked } from "../../utils";

export const blackjack: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("blackjack")
        .setDescription("Play the Blackjack Game")
        .setDMPermission(false)
        .addIntegerOption((o) =>
            o
                .setRequired(true)
                .setName("bet")
                .setDescription("The amount to bet")
                .setMinValue(5)
                .setMaxValue(5000),
        ),
    defer: { silent: false },
    async execute(interaction, responder) {
        if (!interaction.channel || !interaction.deferred) {
            return;
        }
        locked.set(interaction);
        const message = await interaction.fetchReply();
        if (!message) {
            locked.del(interaction.user.id);
            return;
        }

        const amount = interaction.options.getInteger("bet", true);
        const p1 = await getProfileByUserId(interaction.user.id);

        if (!checkBelowBalance(responder, p1, amount)) {
            locked.del(interaction.user.id);
            return;
        }

        await removeBalance(
            interaction.user.id,
            amount,
            true,
            `Via ${blackjack.command.name}`,
        );

        const playerCards = [getRandomCard(), getRandomCard()];
        const dealerCards = [getRandomCard()];

        const embed = new EmbedBuilder()
            .setTitle("`🍀` Blackjack")
            .setColor("#FF9141")
            .setThumbnail(
                "https://cdn.discordapp.com/attachments/1219591114848210968/1238356713191510066/blackjack.png?ex=663efd0f&is=663dab8f&hm=8b86f2c10a4b6d41ae9d23ea61235d8551ccea1decde6bf93486da1425e2ceac&",
            )
            .setDescription(
                `Your hand: **${playerCards.join(", ")}**\nDealer's hand: **${
                    dealerCards[0]
                }**\n\nDo you want to hit or stand?`,
            );

        let tookInsurance = false;

        if (dealerCards[0] === "A") {
            const insuranceRow = addButtonRow([
                {
                    id: "blackjack|insurance",
                    label: "Take Insurance",
                    style: ButtonStyle.Primary,
                },
                {
                    id: "blackjack|noinsurance",
                    label: "Decline Insurance",
                    style: ButtonStyle.Secondary,
                },
            ]);
            const desc = `Your hand: **${playerCards.join(
                ", ",
            )}**\nDealer's hand: **${dealerCards[0]}**`;
            embed.setDescription(`${desc}\n\nDo you want to take insurance?`);

            await responder.edit({
                embeds: [embed],
                components: [insuranceRow],
            });
            const insuranceInteraction = await awaitComponent(message, {
                time: get.secs(30),
                custom_ids: [
                    { id: `blackjack|insurance` },
                    { id: `blackjack|noinsurance` },
                ],
                users: [{ allow: true, id: interaction.user.id }],
            });
            if (!insuranceInteraction) {
                locked.del(interaction.user.id);
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle("`🍀` Blackjack Result")
                    .setDescription(
                        `You took too long to make a choice. You lost ${customEmoji.a.z_coins} \`${amount}\`.`,
                    )
                    .setColor(Colors.Red);

                return responder.edit({
                    embeds: [timeoutEmbed],
                    components: [],
                });
            }
            embed.setDescription(desc);
            await insuranceInteraction
                .update({ embeds: [embed], components: [] })
                .catch(() => null);
            if (insuranceInteraction.customId === "blackjack|insurance") {
                tookInsurance = true;
            }
        }

        const row = addButtonRow([
            {
                id: "blackjack|hit",
                label: "Hit",
                style: ButtonStyle.Success,
            },
            {
                id: "blackjack|stand",
                label: "Stand",
                style: ButtonStyle.Danger,
            },
        ]);

        await responder.edit({
            embeds: [embed],
            components: [row],
        });

        let gameEnded = false;
        let playerBusted = false;

        while (!gameEnded) {
            const buttonInteraction = await awaitComponent(message, {
                time: get.secs(30),
                custom_ids: [{ id: `blackjack|`, includes: true }],
                users: [{ allow: true, id: interaction.user.id }],
            });
            if (!buttonInteraction) {
                locked.del(interaction.user.id);
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle("`🍀` Blackjack Result")
                    .setDescription(
                        `You took too long to make a choice. You lost ${customEmoji.a.z_coins} \`${amount}\`.`,
                    )
                    .setColor("#FF0000");
                return responder.edit({
                    embeds: [timeoutEmbed],
                    components: [],
                });
            }

            if (buttonInteraction.customId === "blackjack|hit") {
                playerCards.push(getRandomCard());

                if (getHandValue(playerCards).value > 21) {
                    gameEnded = true;
                    playerBusted = true;
                } else {
                    const newEmbed = new EmbedBuilder()
                        .setTitle("`🍀` Blackjack")
                        .setColor("#FF9141")
                        .setDescription(
                            `Your cards: **${playerCards.join(
                                ", ",
                            )}**\nDealer's card: **${
                                dealerCards[0]
                            }**\n\nDo you want to hit or stand?`,
                        );

                    await buttonInteraction.update({
                        embeds: [newEmbed],
                        components: [row],
                    });
                }
            } else if (buttonInteraction.customId === "blackjack|stand") {
                gameEnded = true;
            }
        }

        while (getHandValue(dealerCards).value < 17 && !playerBusted) {
            dealerCards.push(getRandomCard());
        }

        const playerTotal = getHandValue(playerCards).value;
        const dealerTotal = getHandValue(dealerCards).value;
        const dealerHand = dealerCards.join(", ");

        let resultMessage = "";
        let playerWon = false;

        if (
            tookInsurance &&
            dealerCards.length === 2 &&
            getHandValue(dealerCards).value === 21
        ) {
            resultMessage = `Dealer got a blackjack! But you took insurance, so you get back your ${customEmoji.a.z_coins} \`${amount}\` bet.`;
            playerWon = true;
        }

        if (playerBusted) {
            resultMessage = `You busted with ${playerTotal}. Dealer's hand: **${dealerHand}**.\nYou lost ${customEmoji.a.z_coins} \`${amount}\`.`;
        } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
            playerWon = true;
            resultMessage = `You won against the dealer's \`${dealerTotal}\` with hand: **${dealerHand}**.\nYou earned ${
                customEmoji.a.z_coins
            } \`${Math.floor(amount * 1.5)}\`!`;
        } else if (playerTotal === dealerTotal) {
            playerWon = true;
            resultMessage = `It's a push since the dealer drew \`${dealerTotal}\` with hand: **${dealerHand}**.\nYou get back your ${customEmoji.a.z_coins} \`${amount}\` bet.`;
        } else {
            resultMessage = `Dealer won with ${dealerTotal} and hand: **${dealerHand}**.\nYou lost ${customEmoji.a.z_coins} \`${amount}\`.`;
        }

        const resultEmbed = new EmbedBuilder()
            .setTitle("`🍀` Blackjack Result")
            .setDescription(resultMessage)
            .setColor(playerWon ? "#00FF00" : "#FF0000");

        if (playerWon) {
            const am =
                playerWon && playerTotal !== dealerTotal
                    ? Math.floor(amount * 1.5)
                    : amount;
            await handleBets(
                interaction.user.id,
                am,
                amount,
                `Via ${blackjack.command.name}`,
            );
        }

        locked.del(interaction.user.id);
        return responder.edit({
            embeds: [resultEmbed],
            components: [],
        });
    },
};

function getRandomCard() {
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
    return cardValues[Math.floor(Math.random() * cardValues.length)];
}

function getCardNumericValue(card: string): number {
    switch (card) {
        case "A":
            return 11;
        case "K":
        case "Q":
        case "J":
            return 10;
        default:
            return parseInt(card);
    }
}

function getHandValue(cards: string[]): { value: number; soft: boolean } {
    let value = 0;
    let acesCount = 0;
    let soft = false;

    for (const card of cards) {
        if (card.startsWith("A")) {
            acesCount++;
        }
        value += getCardNumericValue(card);
    }

    if (acesCount && value <= 11) {
        soft = true;
    }

    while (value > 21 && acesCount) {
        value -= 10;
        acesCount--;
    }

    return { value, soft };
}
