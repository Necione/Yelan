import {
    addButtonRow,
    awaitComponent,
    chunk,
    embedComment,
    get,
    getKeys,
    noop,
} from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { getAmount } from "..";
import { addItemToInventory, removeBalance } from "../../services";
import { artifacts } from "../rpgitems/artifacts";
import { createEvent } from "./utils";

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
const coinCost = 200;

export const traderEvent = createEvent({
    name: "traderEvent",
    weight: 100,
    required: {
        min: {
            rank: 15,
            rebirths: 4,
        },
    },
    async execute(message, stats, userWallet) {
        const artifactNames = getKeys(artifacts);
        if (artifactNames.length < 5) {
            return message
                .edit(
                    embedComment(
                        `The trader doesn't have enough items to offer.`,
                        "Grey",
                        { embed: { title: "Wandering Trader" } },
                    ),
                )
                .catch(noop);
        }

        const uniqueSelectedArtifacts = shuffleArray([...artifactNames]).slice(
            0,
            5,
        );

        const embed = new EmbedBuilder()
            .setTitle("A Wandering Trader Offers His Wares!")
            .setDescription(
                `A mysterious trader appears and offers you some rare artifacts for ${getAmount(
                    coinCost,
                )}.\nChoose an artifact you wish to buy:`,
            )
            .setColor("Gold");

        const buttons = [
            ...uniqueSelectedArtifacts.map((c) => ({
                id: `event|buy|${c}`,
                label: c as string,
                style: ButtonStyle.Primary,
            })),
            {
                id: "event|ignoreTrader",
                label: "Leave",
                style: ButtonStyle.Danger,
            },
        ];

        await message
            .edit({
                embeds: [embed],
                components: chunk(buttons, 5).map((c) => addButtonRow(c)),
            })
            .catch(noop);

        const interaction = await awaitComponent(message, {
            filter: (ii) => ii.customId.startsWith("event|"),
            users: [{ allow: true, id: stats.userId }],
            time: get.secs(15),
        });

        if (!interaction) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "The trader waits for a moment but then continues on his way.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
        const [, type, name] = interaction.customId.split("|");
        if (type === "ignoreTrader") {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "You decided not to engage with the trader and continue on your journey.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
        const chosenArtifact = uniqueSelectedArtifacts.find((c) => c === name);
        if (!chosenArtifact) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "An unexpected error occurred. Please try again later.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        if (userWallet.balance < coinCost) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `You don't have enough ${customEmoji.a.z_coins} to buy \`${chosenArtifact}\`. It costs \`${coinCost} Coins\`.`,
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
            `Purchased ${chosenArtifact} from Wandering Trader`,
        );
        await addItemToInventory(stats.userId, [
            {
                item: chosenArtifact,
                amount: 1,
            },
        ]);

        return message
            .edit({
                embeds: [
                    embed.setDescription(
                        `You purchased \`${chosenArtifact}\` for \`${coinCost} Coins\`! The trader nods in acknowledgment and continues on his way.`,
                    ),
                ],
                components: [],
            })
            .catch(noop);
    },
});
