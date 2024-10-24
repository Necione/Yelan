import { noop } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
} from "discord.js";
import { updateUserStats } from "../../services";

export async function healingWellEvent(
    i: ChatInputCommandInteraction,
    stats: UserStats,
) {
    const embed = new EmbedBuilder()
        .setTitle("You Discover a Healing Well!")
        .setDescription(
            "While exploring, you stumble upon a mysterious well that seems to emanate a soothing aura. Do you want to drink from it?",
        )
        .setColor("Blue");

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("event_drink")
            .setLabel("Drink")
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
                            "You decide not to drink from the well and continue on your journey.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        } else if (interaction.customId === "event_drink") {
            const healAmount = 50;
            const newHP = Math.min(stats.hp + healAmount, stats.maxHP);
            await updateUserStats(i.user.id, { hp: { set: newHP } });

            await i
                .editReply({
                    embeds: [
                        embed.setDescription(
                            `You drink from the well and feel rejuvenated! You recover ❤️ \`${healAmount} HP\`.`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
    });

    collector.on("end", async () => {
        if (!collected) {
            await i
                .editReply({
                    embeds: [
                        embed.setDescription(
                            "You hesitate for too long, and the well disappears as mysteriously as it appeared.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
    });
}
