import type { UserStats } from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type ChatInputCommandInteraction,
    EmbedBuilder,
    type MessageComponentInteraction,
} from "discord.js";
import {
    addItemToInventory,
    getProfileByUserId,
    removeBalance,
    removeItemFromInventory,
} from "../../../services";
import { artifacts } from "../../../utils/rpgitems/artifacts";
import { drops } from "../../../utils/rpgitems/items";

import { customEmoji } from "@liyueharbor/econ";
import { weapons } from "../../../utils/rpgitems/weapons";

function randBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function handleTrade(
    i: ChatInputCommandInteraction,
    stats: UserStats,
) {
    const tradeDeals = generateRandomTradeDeals();

    const userProfile = await getProfileByUserId(i.user.id);
    if (!userProfile) {
        return i.editReply({
            embeds: [
                new EmbedBuilder().setDescription(
                    "No profile found for your user. Please set up your profile.",
                ),
            ],
        });
    }

    const availableInventory = stats.inventory.filter((item) => {
        const isEquipped =
            stats.equippedWeapon === item.item ||
            stats.equippedFlower === item.item ||
            stats.equippedPlume === item.item ||
            stats.equippedSands === item.item ||
            stats.equippedGoblet === item.item ||
            stats.equippedCirclet === item.item;

        return !isEquipped;
    });

    if (availableInventory.length === 0) {
        return i.editReply({
            embeds: [
                new EmbedBuilder().setDescription(
                    "You don't have any unequipped items to trade.",
                ),
            ],
        });
    }

    const tradeDescription = tradeDeals
        .map((deal, index) => {
            const itemToTrade = stats.inventory.find(
                (item) => item.item === deal.requiredItem,
            );
            const hasEnoughItems =
                itemToTrade && itemToTrade.amount >= deal.requiredAmount;
            const hasEnoughCoins = userProfile.balance >= deal.requiredCoins;

            const canTrade = hasEnoughItems && hasEnoughCoins;
            const tradeStatus = canTrade ? "🟢" : "🔴";

            return `${tradeStatus} **Trade ${index + 1}:**\n> Give \`${
                deal.requiredAmount
            }x ${deal.requiredItem}\` + ${customEmoji.a.z_coins} ${
                deal.requiredCoins
            } Coins\n> Get \`${deal.rewardAmount}x ${deal.rewardItem}\``;
        })
        .join("\n\n");

    const tradeEmbed = new EmbedBuilder()
        .setTitle("Trader's Offer")
        .setDescription(tradeDescription)
        .setColor(0xffd700);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("trade_1")
            .setLabel(`Trade 1`)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("trade_2")
            .setLabel(`Trade 2`)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("trade_3")
            .setLabel(`Trade 3`)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("ignore_trade")
            .setLabel("Ignore")
            .setStyle(ButtonStyle.Secondary),
    );

    const message = await i.editReply({
        embeds: [tradeEmbed],
        components: [actionRow],
    });

    if (!message) {
        return;
    }

    const filter = (interaction: MessageComponentInteraction) =>
        interaction.user.id === i.user.id;
    const collector = message.createMessageComponentCollector({
        filter,
        time: 60000,
    });

    let tradeCompleted = false;

    collector.on("collect", async (buttonInteraction) => {
        await buttonInteraction.deferUpdate();

        const selectedTrade = buttonInteraction.customId;

        if (selectedTrade.startsWith("trade_")) {
            const tradeIndex = parseInt(selectedTrade.split("_")[1]) - 1;
            const selectedDeal = tradeDeals[tradeIndex];

            const itemToTrade = stats.inventory.find(
                (item) => item.item === selectedDeal.requiredItem,
            );

            if (
                !itemToTrade ||
                itemToTrade.amount < selectedDeal.requiredAmount
            ) {
                return i.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(
                                `You don't have enough **${selectedDeal.requiredItem}** to complete the trade.`,
                            )
                            .setColor(0xff0000),
                    ],
                    components: [],
                });
            }

            if (userProfile.balance < selectedDeal.requiredCoins) {
                return i.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(
                                `You don't have enough coins to complete the trade.`,
                            )
                            .setColor(0xff0000),
                    ],
                    components: [],
                });
            }

            await removeItemFromInventory(
                i.user.id,
                selectedDeal.requiredItem,
                selectedDeal.requiredAmount,
            );
            await removeBalance(
                i.user.id,
                selectedDeal.requiredCoins,
                true,
                "Trader transaction",
            );

            await addItemToInventory(i.user.id, [
                {
                    item: selectedDeal.rewardItem,
                    amount: selectedDeal.rewardAmount,
                },
            ]);

            const successEmbed = new EmbedBuilder()
                .setDescription(
                    `Trade successful! You traded **${selectedDeal.requiredAmount}x ${selectedDeal.requiredItem}** and **${selectedDeal.requiredCoins} Coins** for **${selectedDeal.rewardAmount}x ${selectedDeal.rewardItem}**.`,
                )
                .setColor(0x00ff00);

            await i.editReply({
                embeds: [successEmbed],
                components: [],
            });

            tradeCompleted = true;
        } else if (selectedTrade === "ignore_trade") {
            await i.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            "You decided to ignore the trader and walk away.",
                        )
                        .setColor(0xffa500),
                ],
                components: [],
            });

            tradeCompleted = true;
        }

        collector.stop();
    });

    collector.on("end", async () => {
        if (!tradeCompleted) {
            await i.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            "The trader left after waiting too long.",
                        )
                        .setColor(0xff0000),
                ],
                components: [],
            });
        }
    });
}

function generateRandomTradeDeals() {
    const possibleWeapons = Object.keys(weapons) as Array<keyof typeof weapons>;
    const possibleArtifacts = Object.keys(artifacts) as Array<
        keyof typeof artifacts
    >;
    const possibleDrops = Object.keys(drops) as Array<keyof typeof drops>;

    const tradeDeals = [];

    for (let i = 0; i < 3; i++) {
        const category = randBetween(0, 2);

        const requiredItem =
            possibleDrops[Math.floor(Math.random() * possibleDrops.length)];
        let rewardItem: string;
        let rewardAmount: number;

        switch (category) {
            case 0:
                rewardItem =
                    possibleWeapons[
                        Math.floor(Math.random() * possibleWeapons.length)
                    ];
                rewardAmount = 1;
                break;
            case 1:
                rewardItem =
                    possibleArtifacts[
                        Math.floor(Math.random() * possibleArtifacts.length)
                    ];
                rewardAmount = 1;
                break;
            case 2:
                rewardItem =
                    possibleDrops[
                        Math.floor(Math.random() * possibleDrops.length)
                    ];
                rewardAmount = randBetween(1, 3);
                break;
            default:
                throw new Error("Invalid category");
        }

        const requiredAmount = randBetween(1, 5);
        const requiredCoins = randBetween(25, 100);

        tradeDeals.push({
            requiredItem,
            requiredAmount,
            requiredCoins,
            rewardItem,
            rewardAmount,
        });
    }

    return tradeDeals;
}
