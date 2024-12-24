import { noop } from "@elara-services/utils";
import { EmbedBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { createEvent } from "./utils";

export const cliffFall = createEvent({
    name: "cliffFallEvent",
    weight: 1,
    async execute(message, stats) {
        const updatedStats = await getUserStats(stats.userId);
        if (!updatedStats) {
            return;
        }

        const levitationEffect = updatedStats.activeEffects.find(
            (eff) => eff.name === "Levitation" && eff.remainingUses > 0,
        );

        if (levitationEffect) {
            levitationEffect.remainingUses -= 1;

            if (levitationEffect.remainingUses <= 0) {
                updatedStats.activeEffects = updatedStats.activeEffects.filter(
                    (eff) => eff !== levitationEffect,
                );
            }

            await updateUserStats(updatedStats.userId, {
                activeEffects: { set: updatedStats.activeEffects },
            });

            const embed = new EmbedBuilder()
                .setTitle("You Slip and Fall Off a Cliff...")
                .setColor("Aqua")
                .setDescription(
                    "But thanks to your **Levitation** potion, you gently float back to safety!\nNo HP lost.",
                );

            return message.edit({ embeds: [embed] }).catch(noop);
        }

        const damagePercentage = Math.random() * 0.2 + 0.1;
        const damageAmount = Math.ceil(updatedStats.maxHP * damagePercentage);
        const newHP = Math.max(updatedStats.hp - damageAmount, 0);

        await updateUserStats(updatedStats.userId, { hp: { set: newHP } });

        const embed = new EmbedBuilder()
            .setTitle("You Slip and Fall Off a Cliff!")
            .setDescription(
                `While navigating a narrow path, you lose your footing and fall off a cliff.\nYou lose **${damageAmount} HP**.`,
            )
            .setColor("Red");

        await message.edit({ embeds: [embed] }).catch(noop);
    },
});
