import { addButtonRow, awaitComponent, get, noop } from "@elara-services/utils";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { updateUserStats } from "../../services";
import { createEvent } from "./utils";

export const healingWell = createEvent({
    name: "healingWell",
    weight: 1,
    async execute(message, stats) {
        const ids = {
            drink: "event_drink",
            ignore: "event_ignore",
        };
        const embed = new EmbedBuilder()
            .setTitle("You Discover a Healing Well!")
            .setDescription(
                "While exploring, you stumble upon a mysterious well that seems to emanate a soothing aura. Do you want to drink from it?",
            )
            .setColor("Blue");

        await message.edit({
            embeds: [embed],
            components: [
                addButtonRow([
                    {
                        id: ids.drink,
                        label: "Drink",
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
                            "You hesitate for too long, and the well disappears as mysteriously as it appeared.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
        if (c.customId !== ids.drink) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "You decide not to drink from the well and continue on your journey.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        const healAmount = stats.maxHP * 0.2;
        const newHP = Math.min(stats.hp + healAmount, stats.maxHP);
        await updateUserStats(stats.userId, { hp: { set: newHP } });

        await message
            .edit({
                embeds: [
                    embed.setDescription(
                        `You drink from the well and feel rejuvenated! You recover ❤️ \`${healAmount} HP\`.`,
                    ),
                ],
                components: [],
            })
            .catch(noop);
    },
});
