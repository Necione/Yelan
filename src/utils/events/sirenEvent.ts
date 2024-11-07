import { noop } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { updateUserStats } from "../../services";

export async function sirenEvent(
    i: ChatInputCommandInteraction,
    stats: UserStats,
) {
    const embed = new EmbedBuilder()
        .setTitle("You Hear a Mysterious Song...")
        .setDescription(
            "While traveling, you hear a captivating song emanating from nearby waters. A Siren appears, and you feel your strength wane. A siren inflicted you with **Weakness** for the next 3 hunts.",
        )
        .setColor("DarkBlue");

    await i
        .editReply({
            embeds: [embed],
            components: [],
        })
        .catch(noop);

    const effectName = "Weakness";
    const effectValue = -0.25;
    const remainingUses = 2;

    stats.activeEffects = stats.activeEffects.filter(
        (effect) => effect.remainingUses > 0,
    );

    const existingEffectIndex = stats.activeEffects.findIndex(
        (effect) => effect.name === effectName,
    );

    if (existingEffectIndex !== -1) {
        stats.activeEffects[existingEffectIndex].remainingUses += remainingUses;
    } else {
        stats.activeEffects.push({
            name: effectName,
            effectValue,
            remainingUses,
        });
    }

    await updateUserStats(i.user.id, {
        activeEffects: stats.activeEffects,
    });
}
