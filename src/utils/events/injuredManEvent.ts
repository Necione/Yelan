import { noop } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import type { UserStats, UserWallet } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
} from "discord.js";
import { addItemToInventory, removeBalance } from "../../services";

export async function injuredManEvent(
    i: ChatInputCommandInteraction,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const embed = new EmbedBuilder()
        .setTitle("An Injured Man Needs Your Help!")
        .setDescription(
            "You come across an injured man who asks you for help. Do you want to help him?",
        )
        .setColor("Yellow");

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("event_help")
            .setLabel("Help")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("event_ignore")
            .setLabel("Ignore")
            .setStyle(ButtonStyle.Danger),
    );

    const message = await i
        .editReply({
            embeds: [embed],
            components: [buttons],
        })
        .catch(noop);

    if (!message) {
        return;
    }

    const filter = (interaction: any) => interaction.user.id === i.user.id;

    const collector = message.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button,
        time: 10_000,
        max: 1,
    });

    let collected = false;

    collector.on("collect", async (interaction: any) => {
        collected = true;
        await interaction.deferUpdate().catch(noop);

        if (interaction.customId === "event_ignore") {
            await i
                .editReply({
                    embeds: [
                        embed.setDescription(
                            "You chose to ignore the man and continue on your way.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        } else if (interaction.customId === "event_help") {
            const coinAmount = 100;
            if (userWallet.balance < coinAmount) {
                await i
                    .editReply({
                        embeds: [
                            embed.setDescription(
                                `You don't have enough ${customEmoji.a.z_coins} to help the man.`,
                            ),
                        ],
                        components: [],
                    })
                    .catch(noop);
                return;
            }

            await removeBalance(
                i.user.id,
                coinAmount,
                false,
                "Donated to injured man",
            );

            if (Math.random() < 0.5) {
                await addItemToInventory(i.user.id, [
                    { item: "Sweet Madame", amount: 1 },
                ]);
                await i
                    .editReply({
                        embeds: [
                            embed.setDescription(
                                "You gave the man `100 Coins`. The man thanks you and gives you a `Sweet Madame` as a token of his appreciation.",
                            ),
                        ],
                        components: [],
                    })
                    .catch(noop);
            } else {
                await i
                    .editReply({
                        embeds: [
                            embed.setDescription(
                                "You gave the man `100 Coins`. The man thanks you and continues on his way.",
                            ),
                        ],
                        components: [],
                    })
                    .catch(noop);
            }
        }
    });

    collector.on("end", async () => {
        if (!collected) {
            await i
                .editReply({
                    embeds: [
                        embed.setDescription(
                            "The man waits for a while but seeing no response, he continues on his way.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
    });
}
