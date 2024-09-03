import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { addBalance, getUserStats, updateUserStats } from "../../services";
import { drops, type DropName } from "../../utils/rpgitems/items";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

type SellableItemName = DropName | WeaponName;

export const sell = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`sell`)
        .setDescription(`[RPG] Sell an item or weapon from your inventory.`)
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The item or weapon to sell")
                .setRequired(true)
                .addChoices(
                    ...getKeys(drops).map((c) => ({
                        name: c,
                        value: c,
                    })),
                    ...getKeys(weapons).map((c) => ({
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
    async execute(i, r) {
        const itemName = i.options.getString("item", true) as SellableItemName;
        const amountToSell = i.options.getInteger("amount", true);

        const itemData =
            drops[itemName as DropName] || weapons[itemName as WeaponName];

        if (!itemData) {
            return r.edit(
                embedComment(`The item "${itemName}" doesn't exist.`),
            );
        }

        const stats = await getUserStats(i.user.id);
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
                embedComment(
                    `You don't have "${itemName}" to sell.\n-# Check your inventory with </rpg:1279824112566665297>`,
                ),
            );
        }
        if (item.amount < amountToSell) {
            return r.edit(
                embedComment(
                    `You don't have enough of "${itemName}" to sell.\n-# Check your inventory with </rpg:1279824112566665297>`,
                ),
            );
        }

        const totalSellPrice = itemData.sellPrice * amountToSell;

        item.amount -= amountToSell;
        if (item.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (c) => c.item !== item.item,
            );
        }

        await Promise.all([
            updateUserStats(i.user.id, {
                inventory: {
                    set: stats.inventory,
                },
            }),
            addBalance(
                i.user.id,
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
