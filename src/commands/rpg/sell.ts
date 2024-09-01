import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { addBalance, getUserStats, updateUserStats } from "../../services";
import { type ItemName, items } from "../../utils/items";

export const sell = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`sell`)
        .setDescription(`[RPG] Sell an item from your inventory.`)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The item to sell")
                .setRequired(true)
                .addChoices(
                    ...getKeys(items).map((c) => ({
                        name: c,
                        value: c,
                    })),
                ),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The amount to sell")
                .setRequired(true),
        ),
    defer: { silent: false },
    async execute(interaction, r) {
        const itemName = interaction.options.getString(
            "item",
            true,
        ) as ItemName;
        const amountToSell = interaction.options.getInteger("amount", true);
        if (!items[itemName]) {
            return r.edit(
                embedComment(`The item "${itemName}" doesn't exist.`),
            );
        }
        const stats = await getUserStats(interaction.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please setup your profile.`,
                ),
            );
        }
        const item = stats.inventory.find((c) => c.item === itemName);
        if (!item) {
            return r.edit(
                embedComment(`You don't have "${itemName}" to sell.\n-# Check your inventory with </rpg:1279824112566665297>`),
            );
        }
        if (item.amount < amountToSell) {
            return r.edit(
                embedComment(`You don't have enough of "${itemName}" to sell.\n-# Check your inventory with </rpg:1279824112566665297>`),
            );
        }
        const itemPrice = items[itemName].sellPrice;
        const totalSellPrice = itemPrice * amountToSell;

        item.amount -= amountToSell;
        if (item.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (c) => c.item !== item.item,
            );
        }

        await Promise.all([
            updateUserStats(interaction.user.id, {
                inventory: {
                    set: stats.inventory,
                },
            }),
            addBalance(
                interaction.user.id,
                totalSellPrice,
                true,
                `Sold ${amountToSell}x ${itemName}`,
            ),
        ]);

        return r.edit(
            embedComment(
                `You sold \`${amountToSell}x\` **${itemName}** for ${customEmoji.a.z_coins} \`${totalSellPrice} ${texts.c.u}\`!`,
                "Green",
            ),
        );
    },
});
