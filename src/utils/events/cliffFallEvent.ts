import { noop } from "@elara-services/utils";
import { EmbedBuilder } from "discord.js";
import { updateUserStats } from "../../services";
import { createEvent } from "./utils";

export const cliffFall = createEvent({
    name: "cliffFallEvent",
    async execute(message, stats) {
        const damagePercentage = 0.1;
        const damageAmount = Math.ceil(stats.maxHP * damagePercentage);
        const newHP = Math.max(stats.hp - damageAmount, 0);

        await updateUserStats(stats.userId, { hp: { set: newHP } });

        const embed = new EmbedBuilder()
            .setTitle("You Slip and Fall Off a Cliff!")
            .setDescription(
                `While navigating a narrow path, you lose your footing and fall off a cliff.\nYou lose **${damageAmount} HP**.`,
            )
            .setColor("Red");

        await message.edit({ embeds: [embed] }).catch(noop);
    },
});
