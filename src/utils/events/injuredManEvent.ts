import {
    addButtonRow,
    awaitComponent,
    get,
    getRandom,
    make,
    noop,
} from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { getAmount } from "..";
import { addItemToInventory, removeBalance } from "../../services";
import { createEvent } from "./utils";

const items = make.array<{ item: string; amount: number }>([
    { item: "Sweet Madame", amount: 1 },
    { item: "Apple", amount: 2 },
    { item: "Almond", amount: 1 },
    { item: "Jewelry Soup", amount: 1 },
    { item: "Jade Parcels", amount: 1 },
    { item: "Golden Crab", amount: 1 },
]);

export const injuredMan = createEvent({
    name: "injuredMan",
    weight: 1,
    async execute(message, stats, userWallet) {
        const randomItem = getRandom(items);
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

        await message
            .edit({
                embeds: [embed],
                components: [
                    addButtonRow([
                        {
                            id: ids.help,
                            label: "Help",
                            style: ButtonStyle.Success,
                        },
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
                            "The man waits for a while but seeing no response, he continues on his way.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
        if (c.customId !== ids.help) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "You chose to ignore the man and continue on your way.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
        const coinAmount = 50;
        if (userWallet.balance < coinAmount) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `You don't have enough ${customEmoji.a.z_coins} to help the man.`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        await removeBalance(
            stats.userId,
            coinAmount,
            false,
            "Donated to injured man",
        );

        if (Math.random() < 0.5) {
            await addItemToInventory(stats.userId, [randomItem]);
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `You gave the man ${getAmount(
                                50,
                            )}. The man thanks you and gives you a \`${
                                randomItem.item
                            }\` as a token of his appreciation.`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
        return message
            .edit({
                embeds: [
                    embed.setDescription(
                        `You gave the man ${getAmount(
                            50,
                        )}. The man thanks you and continues on his way.`,
                    ),
                ],
                components: [],
            })
            .catch(noop);
    },
});
