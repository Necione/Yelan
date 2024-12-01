import {
    addButtonRow,
    awaitComponent,
    embedComment,
    get,
    getInteractionResponder,
    make,
} from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import type { UserStats, UserWallet } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { addItemToInventory, removeBalance } from "../../services";

const items = make.array<{ item: string; amount: number }>([
    { item: "Sweet Madame", amount: 1 },
    { item: "Apple", amount: 2 },
    { item: "Almond", amount: 1 },
    { item: "Jewelry Soup", amount: 1 },
    { item: "Jade Parcels", amount: 1 },
    { item: "Golden Crab", amount: 1 },
]);

const randomItem = items[Math.floor(Math.random() * items.length)];

export async function injuredManEvent(
    i: ChatInputCommandInteraction,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const r = getInteractionResponder(i);
    const ids = {
        help: "event_help",
        ignore: "event_ignore",
    };
    const embed = new EmbedBuilder()
        .setTitle("An Injured Man Needs Your Help!")
        .setDescription(
            "You come across an injured man who asks you for help. Do you want to help him?",
        )
        .setColor("Yellow");

    const message = await r.edit({
        embeds: [embed],
        components: [
            addButtonRow([
                { id: ids.help, label: "Help", style: ButtonStyle.Success },
                { id: ids.ignore, label: "Ignore", style: ButtonStyle.Danger },
            ]),
        ],
    });

    if (!message) {
        return r.edit(
            embedComment(`Unable to fetch the original components message.`),
        );
    }
    const c = await awaitComponent(message, {
        filter: (ii) => ii.customId.startsWith("event_"),
        users: [{ allow: true, id: i.user.id }],
        time: get.secs(10),
    });
    if (!c) {
        return r.edit({
            embeds: [
                embed.setDescription(
                    "The man waits for a while but seeing no response, he continues on his way.",
                ),
            ],
            components: [],
        });
    }
    if (c.customId !== ids.help) {
        return r.edit({
            embeds: [
                embed.setDescription(
                    "You chose to ignore the man and continue on your way.",
                ),
            ],
            components: [],
        });
    }
    const coinAmount = 50;
    if (userWallet.balance < coinAmount) {
        return r.edit({
            embeds: [
                embed.setDescription(
                    `You don't have enough ${customEmoji.a.z_coins} to help the man.`,
                ),
            ],
            components: [],
        });
    }

    await removeBalance(i.user.id, coinAmount, false, "Donated to injured man");

    if (Math.random() < 0.5) {
        await addItemToInventory(i.user.id, [randomItem]);
        return r.edit({
            embeds: [
                embed.setDescription(
                    `You gave the man \`100 Coins\`. The man thanks you and gives you a \`${randomItem.item}\` as a token of his appreciation.`,
                ),
            ],
            components: [],
        });
    }
    return r.edit({
        embeds: [
            embed.setDescription(
                "You gave the man `100 Coins`. The man thanks you and continues on his way.",
            ),
        ],
        components: [],
    });
}
