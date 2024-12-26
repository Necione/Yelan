import {
    addButtonRow,
    awaitComponent,
    get,
    getRandom,
    noop,
} from "@elara-services/utils";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { createEvent } from "./utils";

const adviceArray = [
    "Having your HP above your max can lead to Overheal Poisoning, which halves your damage!",
    "Upgrade your skills with the `/upgrade` command using tokens. You get a token every rebirth.",
    "Jade Parcels will heal 100% of your HP, you should make some, they're delicious!",
    "You can brew all sorts of potions with Chaos Devices and Chaos Cores.",
    "Casting the Poison spell with a Catalyst stops special effects like a Nobushi's discipline or a Fatui Agent's Vanish.",
];

const rumorArray = [
    "They say the Serendipity can catch all sorts of Legendary fish, I wonder how much they sell for!",
    "Rumor has it there's a legendary sword that never dulls if you find all its pieces.",
];

export const travellerEvent = createEvent({
    name: "travellerEvent",
    weight: 1,

    async execute(message, stats) {
        const ids = {
            advice: "traveller_advice",
            rumor: "traveller_rumor",
            ignore: "traveller_ignore",
        };

        const embed = new EmbedBuilder()
            .setTitle("You Encounter a Fellow Traveller")
            .setDescription(
                "A fellow traveller greets you and offers to share some knowledge or rumors from distant lands.",
            )
            .setColor("Blue");

        await message.edit({
            embeds: [embed],
            components: [
                addButtonRow([
                    {
                        id: ids.advice,
                        label: "Talk Advice",
                        style: ButtonStyle.Primary,
                    },
                    {
                        id: ids.rumor,
                        label: "Talk Rumors",
                        style: ButtonStyle.Success,
                    },
                    {
                        id: ids.ignore,
                        label: "Ignore",
                        style: ButtonStyle.Danger,
                    },
                ]),
            ],
        });

        const interaction = await awaitComponent(message, {
            filter: (ii) => ii.customId.startsWith("traveller_"),
            users: [{ allow: true, id: stats.userId }],
            time: get.secs(15),
        });

        if (!interaction) {
            const timedOutEmbed = EmbedBuilder.from(embed).setDescription(
                "The traveller waits patiently, but you say nothing. They shrug and walk away.",
            );
            return message
                .edit({
                    embeds: [timedOutEmbed],
                    components: [],
                })
                .catch(noop);
        }

        const { customId } = interaction;
        if (customId === ids.ignore) {
            const ignoreEmbed = EmbedBuilder.from(embed).setDescription(
                "You decided not to talk. The traveller continues on their way.",
            );
            return interaction
                .update({
                    embeds: [ignoreEmbed],
                    components: [],
                })
                .catch(noop);
        }

        if (customId === ids.advice) {
            const randomAdvice = getRandom(adviceArray);
            const adviceEmbed = EmbedBuilder.from(embed)
                .setTitle("Friendly Advice")
                .setColor("Green")
                .setDescription(
                    `The traveller shares a piece of advice:\n\n> *${randomAdvice}*`,
                );

            return interaction
                .update({
                    embeds: [adviceEmbed],
                    components: [],
                })
                .catch(noop);
        }

        if (customId === ids.rumor) {
            const randomRumor = getRandom(rumorArray);
            const rumorEmbed = EmbedBuilder.from(embed)
                .setTitle("Intriguing Rumor")
                .setColor("DarkGreen")
                .setDescription(
                    `The traveller leans in and whispers a rumor:\n\n> *${randomRumor}*`,
                );

            return interaction
                .update({
                    embeds: [rumorEmbed],
                    components: [],
                })
                .catch(noop);
        }

        const errorEmbed = EmbedBuilder.from(embed).setDescription(
            "An unexpected error occurred. Please try again later.",
        );
        return message
            .edit({
                embeds: [errorEmbed],
                components: [],
            })
            .catch(noop);
    },
});
