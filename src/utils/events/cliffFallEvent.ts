import { noop } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { updateUserStats } from "../../services";

export async function cliffFallEvent(
    i: ChatInputCommandInteraction,
    stats: UserStats,
) {
    const damagePercentage = 0.1;
    const damageAmount = Math.ceil(stats.maxHP * damagePercentage);
    const newHP = Math.max(stats.hp - damageAmount, 0);

    await updateUserStats(i.user.id, { hp: { set: newHP } });

    const embed = new EmbedBuilder()
        .setTitle("You Slip and Fall Off a Cliff!")
        .setDescription(
            `While navigating a narrow path, you lose your footing and fall off a cliff.\nYou lose **${damageAmount} HP**.`,
        )
        .setColor("Red");

    await i
        .editReply({
            embeds: [embed],
        })
        .catch(noop);
}
