import { embedComment, noop } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type { ButtonInteraction } from "discord.js";
import { updateUserStats } from "../../../services";

export async function handleHealingWell(
    collected: ButtonInteraction,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const healingPercentage = 0.25;

    const maxHp = stats.maxHP || 100;
    const healAmount = Math.floor(maxHp * healingPercentage);
    const newHP = Math.min(stats.hp + healAmount, maxHp);

    await updateUserStats(collected.user.id, { hp: { set: newHP } });

    const healMessage = `*You drink from the healing well, restoring \`${healAmount} HP\`.*\n*Current HP: \`${newHP}/${maxHp}\`*`;

    await collected
        .update({
            ...embedComment(healMessage, "Green"),
            components: [],
        })
        .catch(noop);
}
