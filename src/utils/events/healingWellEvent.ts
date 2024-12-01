import {
    addButtonRow,
    awaitComponent,
    embedComment,
    get,
    getInteractionResponder,
} from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { updateUserStats } from "../../services";

export async function healingWellEvent(
    i: ChatInputCommandInteraction,
    stats: UserStats,
) {
    const ids = {
        drink: "event_drink",
        ignore: "event_ignore",
    };
    const r = getInteractionResponder(i);
    const embed = new EmbedBuilder()
        .setTitle("You Discover a Healing Well!")
        .setDescription(
            "While exploring, you stumble upon a mysterious well that seems to emanate a soothing aura. Do you want to drink from it?",
        )
        .setColor("Blue");

    const message = await r.edit({
        embeds: [embed],
        components: [
            addButtonRow([
                { id: ids.drink, label: "Drink", style: ButtonStyle.Success },
                { id: ids.ignore, label: "Ignore", style: ButtonStyle.Danger },
            ]),
        ],
    });

    if (!message) {
        return r.edit(
            embedComment(
                `Unable to get the returned message for the components`,
            ),
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
                    "You hesitate for too long, and the well disappears as mysteriously as it appeared.",
                ),
            ],
            components: [],
        });
    }
    if (c.customId !== ids.drink) {
        return r.edit({
            embeds: [
                embed.setDescription(
                    "You decide not to drink from the well and continue on your journey.",
                ),
            ],
            components: [],
        });
    }

    const healAmount = stats.maxHP * 0.2;
    const newHP = Math.min(stats.hp + healAmount, stats.maxHP);
    await updateUserStats(i.user.id, { hp: { set: newHP } });

    await r.edit({
        embeds: [
            embed.setDescription(
                `You drink from the well and feel rejuvenated! You recover ❤️ \`${healAmount} HP\`.`,
            ),
        ],
        components: [],
    });
}
