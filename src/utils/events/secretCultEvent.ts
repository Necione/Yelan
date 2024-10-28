import { noop } from "@elara-services/utils";
import type { ChatInputCommandInteraction } from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
} from "discord.js";
import { getUserStats, updateUserStats } from "../../services";

export async function secretCultEvent(i: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setTitle("You Encounter a Secret Cult!")
        .setDescription(
            "While exploring, you stumble upon a secret cult performing a ritual. They offer you a mysterious blessing. Do you accept it?",
        )
        .setColor("Purple");

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("event_accept")
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("event_refuse")
            .setLabel("Refuse")
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

        if (interaction.customId === "event_refuse") {
            await i
                .editReply({
                    embeds: [
                        embed.setDescription(
                            "You politely decline the offer and continue on your journey.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        } else if (interaction.customId === "event_accept") {
            const outcome = Math.random();
            let effectName = "";
            let effectValue = 0;
            const remainingUses = 5;

            if (outcome < 0.5) {
                effectName = "Regeneration";
                effectValue = 0.2;
                await i
                    .editReply({
                        embeds: [
                            embed.setDescription(
                                `The cult bestows a blessing upon you! You have gained **Regeneration** effect for the next **${remainingUses} hunts**.`,
                            ),
                        ],
                        components: [],
                    })
                    .catch(noop);
            } else {
                effectName = "Poisoning";
                effectValue = -0.2;
                await i
                    .editReply({
                        embeds: [
                            embed.setDescription(
                                `The cult's blessing backfires! You have been inflicted with **Poisoning** effect for the next **${remainingUses} hunts**.`,
                            ),
                        ],
                        components: [],
                    })
                    .catch(noop);
            }

            const newEffect = {
                name: effectName,
                effectValue,
                remainingUses,
            };

            const updatedStats = await getUserStats(i.user.id);
            if (updatedStats) {
                updatedStats.activeEffects = updatedStats.activeEffects.filter(
                    (effect) => effect.remainingUses > 0,
                );

                const existingEffectIndex =
                    updatedStats.activeEffects.findIndex(
                        (effect) => effect.name === effectName,
                    );

                if (existingEffectIndex !== -1) {
                    updatedStats.activeEffects[
                        existingEffectIndex
                    ].remainingUses += remainingUses;
                } else {
                    updatedStats.activeEffects.push(newEffect);
                }

                await updateUserStats(i.user.id, {
                    activeEffects: updatedStats.activeEffects,
                });
            }
        }
    });

    collector.on("end", async () => {
        if (!collected) {
            await i
                .editReply({
                    embeds: [
                        embed.setDescription(
                            "Before you can make a decision, the cult disappears into the shadows.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
    });
}
