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

const accessFee = 200;

export const traderEvent = createEvent({
    name: "traderEvent",
    weight: 1,
    required: {
        min: {
            rank: 25,
            rebirths: 5,
        },
    },
    async execute(message, stats, userWallet) {
        const accessEmbed = new EmbedBuilder()
            .setTitle("A Wandering Trader Approaches!")
            .setDescription(
                `The trader offers to show you his exclusive collection of rare artifacts for **${getAmount(
                    accessFee,
                )}**.\nDo you wish to view his wares?`,
            )
            .setColor("Gold");

        const accessButtons = [
            {
                id: "event|trader|pay",
                label: "Pay",
                style: ButtonStyle.Primary,
            },
            {
                id: "event|trader|ignore",
                label: "Ignore",
                style: ButtonStyle.Danger,
            },
        ];

        await message
            .edit({
                embeds: [accessEmbed],
                components: [addButtonRow(accessButtons)],
            })
            .catch(noop);

        const accessInteraction = await awaitComponent(message, {
            filter: (ii) => ii.customId.startsWith("event|trader|"),
            users: [{ allow: true, id: stats.userId }],
            time: get.secs(30),
        });

        if (!accessInteraction) {
            return message
                .edit({
                    embeds: [
                        accessEmbed.setDescription(
                            "The trader waits for a moment but then continues on his way.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        const accessCustomIdParts = accessInteraction.customId.split("|");
        const action = accessCustomIdParts[2];

        if (action === "ignore") {
            return message
                .edit({
                    embeds: [
                        accessEmbed.setDescription(
                            "You decided not to engage with the trader and continue on your journey.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        if (action === "pay") {
            if (userWallet.balance < accessFee) {
                return message
                    .edit({
                        embeds: [
                            accessEmbed.setDescription(
                                `You don't have enough ${
                                    customEmoji.a.z_coins
                                } to pay the access fee of **${getAmount(
                                    accessFee,
                                )} Coins**.`,
                            ),
                        ],
                        components: [],
                    })
                    .catch(noop);
            }

            await removeBalance(
                stats.userId,
                accessFee,
                false,
                `Paid access fee to Wandering Trader`,
            );

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

            const uniqueSelectedArtifacts = shuffleArray([
                ...artifactNames,
            ]).slice(0, 5);

            const waresEmbed = new EmbedBuilder()
                .setTitle("A Wandering Trader Offers His Wares!")
                .setDescription(
                    `A mysterious trader presents you with some rare artifacts.\nChoose an artifact you wish to take:`,
                )
                .setColor("Gold");

            const waresButtons = [
                ...uniqueSelectedArtifacts.map((c) => ({
                    id: `event|trader|claim|${c}`,
                    label: c as string,
                    style: ButtonStyle.Primary,
                })),
                {
                    id: "event|trader|leave",
                    label: "Leave",
                    style: ButtonStyle.Danger,
                },
            ];

            await message
                .edit({
                    embeds: [waresEmbed],
                    components: chunk(waresButtons, 5).map((c) =>
                        addButtonRow(c),
                    ),
                })
                .catch(noop);

            const waresInteraction = await awaitComponent(message, {
                filter: (ii) => ii.customId.startsWith("event|trader|"),
                users: [{ allow: true, id: stats.userId }],
                time: get.secs(30),
            });

            if (!waresInteraction) {
                return message
                    .edit({
                        embeds: [
                            waresEmbed.setDescription(
                                "The trader waits for a moment but then continues on his way.",
                            ),
                        ],
                        components: [],
                    })
                    .catch(noop);
            }

            const waresCustomIdParts = waresInteraction.customId.split("|");
            const waresAction = waresCustomIdParts[2];
            const artifactName = waresCustomIdParts[3];

            if (waresAction === "leave") {
                return message
                    .edit({
                        embeds: [
                            waresEmbed.setDescription(
                                "You decided not to claim any artifacts and the trader continues on his way.",
                            ),
                        ],
                        components: [],
                    })
                    .catch(noop);
            }

            if (waresAction === "claim") {
                if (!artifactName) {
                    return message
                        .edit({
                            embeds: [
                                waresEmbed.setDescription(
                                    "An unexpected error occurred. Please try again later.",
                                ),
                            ],
                            components: [],
                        })
                        .catch(noop);
                }

                const chosenArtifact = uniqueSelectedArtifacts.find(
                    (c) => c === artifactName,
                );
                if (!chosenArtifact) {
                    return message
                        .edit({
                            embeds: [
                                waresEmbed.setDescription(
                                    "An unexpected error occurred. Please try again later.",
                                ),
                            ],
                            components: [],
                        })
                        .catch(noop);
                }

                await addItemToInventory(stats.userId, [
                    {
                        item: chosenArtifact,
                        amount: 1,
                    },
                ]);

                return message
                    .edit({
                        embeds: [
                            waresEmbed.setDescription(
                                `You have claimed \`${chosenArtifact}\`! The trader nods in acknowledgment and continues on his way.`,
                            ),
                        ],
                        components: [],
                    })
                    .catch(noop);
            }

            return message
                .edit({
                    embeds: [
                        waresEmbed.setDescription(
                            "An unexpected error occurred. Please try again later.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
    },
});
