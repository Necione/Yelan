import type { SlashCommand } from "@elara-services/botbuilder";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { addBalance, getUserStats, updateUserStats } from "../../services";
import { ItemName, items } from "../../utils/items";

export const sell: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName(`sell`)
        .setDescription(`[RPG] Sell an item from your inventory.`)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The item to sell")
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The amount to sell")
                .setRequired(true),
        ),
    defer: { silent: false },
    async execute(interaction, responder) {
        const itemName = interaction.options
            .getString("item")!
            .trim() as ItemName;
        const amountToSell = interaction.options.getInteger("amount")!;
        const userId = interaction.user.id;

        if (!items[itemName]) {
            return responder.edit(`The item "${itemName}" does not exist.`);
        }

        const stats = await getUserStats(userId);
        if (!stats) {
            return responder.edit(
                "No stats found for your user. Please set up your profile.",
            );
        }

        const inventory =
            (stats.inventory as { item: string; amount: number }[]) || [];
        const itemIndex = inventory.findIndex((i) => i.item === itemName);

        if (itemIndex === -1 || inventory[itemIndex].amount < amountToSell) {
            return responder.edit(
                `You do not have enough of ${itemName} to sell.`,
            );
        }

        const itemPrice = items[itemName].sellPrice;
        const totalSellPrice = itemPrice * amountToSell;

        inventory[itemIndex].amount -= amountToSell;
        if (inventory[itemIndex].amount <= 0) {
            inventory.splice(itemIndex, 1);
        }

        await Promise.all([
            updateUserStats(userId, { inventory }),
            addBalance(
                userId,
                totalSellPrice,
                true,
                `Sold ${amountToSell}x ${itemName}`,
            ),
        ]);

        return responder.edit(
            `You sold \`${amountToSell}x\` **${itemName}** for ${customEmoji.a.z_coins} \`${totalSellPrice} ${texts.c.u}\`!`,
        );
    },
};
