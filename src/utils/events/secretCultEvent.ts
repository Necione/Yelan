import { addButtonRow, awaitComponent, get, noop } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import { ButtonStyle, EmbedBuilder, type Message } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";

export async function secretCultEvent(message: Message, stats: UserStats) {
    const embed = new EmbedBuilder()
        .setTitle("You Encounter a Secret Cult!")
        .setDescription(
            "While exploring, you stumble upon a secret cult performing a ritual. They offer you a mysterious blessing. Do you accept it?",
        )
        .setColor("Purple");

    await message
        .edit({
            embeds: [embed],
            components: [
                addButtonRow([
                    {
                        id: "event_accept",
                        label: "Accept",
                        style: ButtonStyle.Success,
                    },
                    {
                        id: "event_refuse",
                        label: "Refuse",
                        style: ButtonStyle.Danger,
                    },
                ]),
            ],
        })
        .catch(noop);
    const c = await awaitComponent(message, {
        filter: (int) => int.customId.startsWith("event_"),
        users: [{ allow: true, id: stats.userId }],
        time: get.secs(10),
    });
    if (!c) {
        return message
            .edit({
                embeds: [
                    embed.setDescription(
                        "Before you can make a decision, the cult disappears into the shadows.",
                    ),
                ],
                components: [],
            })
            .catch(noop);
    }
    if (c.customId !== "events_accept") {
        return message
            .edit({
                embeds: [
                    embed.setDescription(
                        "You politely decline the offer and continue on your journey.",
                    ),
                ],
                components: [],
            })
            .catch(noop);
    }

    const outcome = Math.random();
    const remainingUses = 5;
    let effectName = "";
    let effectValue = 0;

    if (outcome < 0.5) {
        effectName = "Regeneration";
        effectValue = 0.2;
        await message
            .edit({
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
        effectValue = -0.25;
        await message
            .edit({
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

    const updatedStats = await getUserStats(stats.userId);
    if (updatedStats) {
        updatedStats.activeEffects = updatedStats.activeEffects.filter(
            (effect) => effect.remainingUses > 0,
        );

        const existingEffectIndex = updatedStats.activeEffects.findIndex(
            (effect) => effect.name === effectName,
        );

        if (existingEffectIndex !== -1) {
            updatedStats.activeEffects[existingEffectIndex].remainingUses +=
                remainingUses;
        } else {
            updatedStats.activeEffects.push(newEffect);
        }

        await updateUserStats(stats.userId, {
            activeEffects: {
                set: updatedStats.activeEffects,
            },
        });
    }
}
