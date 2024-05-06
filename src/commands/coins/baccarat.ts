import type { SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { channels } from "../../config";
import { addBalance, getProfileByUserId, removeBalance } from "../../services";
import {
    checkBelowBalance,
    checks,
    customEmoji,
    locked,
    userLockedData,
} from "../../utils";

type CardKey =
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K"
    | "A";

const cardValues: Record<CardKey, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 0,
    J: 0,
    Q: 0,
    K: 0,
    A: 1,
};

const drawCard = (): CardKey => {
    const cards: CardKey[] = [
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
        "A",
    ];
    return cards[Math.floor(Math.random() * cards.length)];
};

const getCardValue = (card: CardKey) => cardValues[card];

const getHandValue = (cards: CardKey[]) => {
    return cards.map((c) => getCardValue(c)).reduce((a, b) => a + b, 0) % 10;
};

export const baccarat: SlashCommand = {
    locked: {
        channels: [
            ...channels.gamblingcommands,
            ...channels.testingbotcommands,
        ],
    },
    command: new SlashCommandBuilder()
        .setName(`baccarat`)
        .setDescription(`Play a game of Baccarat.`)
        .setDMPermission(false)
        .addStringOption((o) =>
            o
                .setRequired(true)
                .setName("winner")
                .setDescription("Choose to bet on Player or Banker")
                .addChoices(
                    { name: "Player", value: "player" },
                    { name: "Banker", value: "banker" },
                ),
        )
        .addIntegerOption((o) =>
            o
                .setRequired(true)
                .setName("bet")
                .setDescription("The bet amount")
                .setMinValue(5)
                .setMaxValue(1000),
        ),
    defer: { silent: false },
    async execute(interaction, responder) {
        if (!interaction.deferred) {
            return;
        }
        locked.set(interaction);
        const betAmount = interaction.options.getInteger("bet", true);
        const playerChoice = interaction.options.getString("winner", true);

        const p1 = await getProfileByUserId(interaction.user.id);

        if (p1.locked) {
            return responder.edit(userLockedData(interaction.user.id));
        }

        if (!checkBelowBalance(responder, p1, betAmount)) {
            return locked.del(interaction.user.id);
        }
        if (checks.limit(p1, betAmount)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`You've reached your daily coin earning limit.`),
            );
        }

        const playerHand = [drawCard(), drawCard()];
        const bankerHand = [drawCard(), drawCard()];

        const playerValue = getHandValue(playerHand);
        const bankerValue = getHandValue(bankerHand);

        if (playerValue < 8 && bankerValue < 8) {
            if (playerValue <= 5) {
                playerHand.push(drawCard());
            }
            if (bankerValue <= 5) {
                bankerHand.push(drawCard());
            }
        }

        const finalPlayerValue = getHandValue(playerHand);
        const finalBankerValue = getHandValue(bankerHand);

        const result =
            finalPlayerValue === finalBankerValue
                ? "Tie"
                : finalPlayerValue > finalBankerValue
                  ? "Player Wins"
                  : "Banker Wins";

        const e = new EmbedBuilder()
            .setTitle("`🎩` Baccarat Game")
            .setColor(Colors.Green);

        const didPlayerWin =
            (result === "Player Wins" && playerChoice === "player") ||
            (result === "Banker Wins" && playerChoice === "banker");

        const winnings = Math.floor(betAmount * 0.98);
        const theoreticalWinnings = Math.floor(winnings + betAmount);

        if (didPlayerWin) {
            await addBalance(
                interaction.user.id,
                winnings,
                true,
                `Via ${baccarat.command.name}`,
            );
            e.setDescription(
                `Player hand: ${playerHand.join(
                    ", ",
                )}\nBanker hand: ${bankerHand.join(", ")}\n\nYou won ${
                    customEmoji.a.z_coins
                } \`${theoreticalWinnings}\` Coins!`,
            );
        } else if (result === "Tie") {
            e.setDescription(
                `Player hand: ${playerHand.join(
                    ", ",
                )}\nBanker hand: ${bankerHand.join(", ")}\n\nIt's a tie!`,
            );
        } else {
            await removeBalance(
                interaction.user.id,
                betAmount,
                true,
                `Via ${baccarat.command.name}`,
            );
            e.setDescription(
                `Player hand: ${playerHand.join(
                    ", ",
                )}\nBanker hand: ${bankerHand.join(", ")}\n\nYou lost ${
                    customEmoji.a.z_coins
                } \`${betAmount}\` Coins!`,
            );
        }
        locked.del(interaction.user.id);

        return responder.edit({
            embeds: [e],
            components: [],
        });
    },
};
