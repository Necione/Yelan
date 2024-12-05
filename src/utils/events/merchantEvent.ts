import {
    addButtonRow,
    awaitComponent,
    get,
    make,
    noop,
} from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import type { UserStats, UserWallet } from "@prisma/client";
import { ButtonStyle, EmbedBuilder, type Message } from "discord.js";
import { addItemToInventory, removeBalance } from "../../services";

const goldenItems = make.array<{ item: string; amount: number }>([
    { item: "Golden Song's Variation", amount: 1 },
    { item: "Golden Bird's Shedding", amount: 1 },
    { item: "Golden Era's Prelude", amount: 1 },
    { item: "Golden Night's Bustle", amount: 1 },
    { item: "Golden Troupe's Reward", amount: 1 },
]);

const otherItems = make.array<{ item: string; amount: number }>([
    { item: "Jade Parcels", amount: 5 },
    { item: "Life Essence", amount: 3 },
    { item: "Geode", amount: 2 },
    { item: "Operative's Constancy", amount: 3 },
    { item: "Famed Handguard", amount: 3 },
    { item: "Chaos Oculus", amount: 3 },
    { item: "Chaos Core", amount: 3 },
    { item: "Rich Red Brocade", amount: 3 },
    { item: "Wanderer's Blooming Flower", amount: 3 },
    { item: "Inspector's Sacrificial Knife", amount: 3 },
    { item: "Mist Grass Wick", amount: 3 },
    { item: "Polarizing Prism", amount: 3 },
    { item: "Redrot Bait", amount: 20 },
]);

export async function merchantEvent(
    message: Message,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const ids = {
        buy: "event_buy",
        ignore: "event_ignore",
    };
    const embed = new EmbedBuilder()
        .setTitle("A Mysterious Merchant Approaches!")
        .setDescription(
            `A cloaked figure appears, offering you a rare item for \`1000\` ${texts.c.u}. Do you wish to buy it?`,
        )
        .setColor("Gold");

    await message
        .edit({
            embeds: [embed],
            components: [
                addButtonRow([
                    { id: ids.buy, label: "Buy", style: ButtonStyle.Success },
                    {
                        id: ids.ignore,
                        label: "Ignore",
                        style: ButtonStyle.Danger,
                    },
                ]),
            ],
        })
        .catch(noop);

    const c = await awaitComponent(message, {
        filter: (ii) => ii.customId.startsWith("event_"),
        users: [{ allow: true, id: stats.userId }],
        time: get.secs(10),
    });

    if (!c) {
        return message
            .edit({
                embeds: [
                    embed.setDescription(
                        "The merchant waits briefly but then disappears into the crowd.",
                    ),
                ],
                components: [],
            })
            .catch(noop);
    }
    if (c.customId !== ids.buy) {
        return message
            .edit({
                embeds: [
                    embed.setDescription(
                        "You decide not to engage with the merchant and continue on your way.",
                    ),
                ],
                components: [],
            })
            .catch(noop);
    }
    const coinCost = 1000;
    if (userWallet.balance < coinCost) {
        return message
            .edit({
                embeds: [
                    embed.setDescription(
                        `You don't have enough ${customEmoji.a.z_coins} ${texts.c.u} to make the purchase.`,
                    ),
                ],
                components: [],
            })
            .catch(noop);
    }

    await removeBalance(
        stats.userId,
        coinCost,
        false,
        "Purchased from Merchant",
    );

    let receivedItem;
    if (Math.random() < 0.25) {
        // 25% chance to get a golden item
        const randomGoldenItem =
            goldenItems[Math.floor(Math.random() * goldenItems.length)];
        receivedItem = randomGoldenItem;
    } else {
        // 75% chance to get another item
        const randomOtherItem =
            otherItems[Math.floor(Math.random() * otherItems.length)];
        receivedItem = randomOtherItem;
    }

    await addItemToInventory(stats.userId, [receivedItem]);

    return message
        .edit({
            embeds: [
                embed.setDescription(
                    `You hand over \`${coinCost} ${texts.c.u}\` and receive \`${receivedItem.amount}x ${receivedItem.item}\`! The merchant smiles and vanishes.`,
                ),
            ],
            components: [],
        })
        .catch(noop);
}
