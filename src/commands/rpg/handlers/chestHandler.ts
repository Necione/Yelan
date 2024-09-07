import { embedComment, get } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import type { UserStats, UserWallet } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import { addBalance, addItemToInventory } from "../../../services";
import { cooldowns } from "../../../utils";
import { generateChestLoot } from "../../../utils/chest";

export async function handleChest(
    i: ChatInputCommandInteraction,
    stats: UserStats,
    userWallet: UserWallet,
) {
    const { rarity, loot, coins } = generateChestLoot(stats.worldLevel);

    await addBalance(
        i.user.id,
        coins,
        false,
        `Found a ${rarity} Treasure Chest`,
    );

    if (loot.length > 0) {
        await addItemToInventory(i.user.id, loot);
    }

    const lootDescription =
        loot.length > 0
            ? loot.map((item) => `\`${item.amount}x\` ${item.item}`).join(", ")
            : "";

    const message = lootDescription
        ? `You stumbled upon a ${rarity} Treasure Chest!\nIt contained ${customEmoji.a.z_coins} \`${coins} Coins\` and the following items:\n${lootDescription}`
        : `You stumbled upon a ${rarity} Treasure Chest!\nIt contained ${customEmoji.a.z_coins} \`${coins} Coins\`.`;

    await i.editReply(embedComment(message, "Green")).catch(() => null);

    await cooldowns.set(userWallet, "hunt", get.hrs(1));
}
