import { embedComment, get } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { ChatInputCommandInteraction } from "discord.js";
import { addBalance, addItemToInventory } from "../../../services";
import { cooldowns } from "../../../utils";
import { generateChestLoot } from "../../../utils/chest";
export async function handleChest(
    i: ChatInputCommandInteraction,
    stats: any,
    userWallet: any,
) {
    const { rarity, loot, coins } = generateChestLoot(stats.worldLevel);

    await addBalance(
        i.user.id,
        coins,
        false,
        `Found a ${rarity} Treasure Chest`,
    );

    await addItemToInventory(i.user.id, loot);

    const lootDescription = loot
        .map((item) => `\`${item.amount}x\` ${item.item}`)
        .join(", ");

    await i.editReply(
        embedComment(
            `You stumbled upon a ${rarity} Treasure Chest!\nIt contained ${customEmoji.a.z_coins} \`${coins} Coins\` and the following items:\n${lootDescription}`,
            "Green",
        ),
    );

    await cooldowns.set(userWallet, "hunt", get.hrs(1));
}
