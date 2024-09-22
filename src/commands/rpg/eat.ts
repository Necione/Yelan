import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { food, type FoodName } from "../../utils/rpgitems/food";

export const eat = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("eat")
        .setDescription("[RPG] Consume a food item to restore HP.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The food item you want to eat")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The number of items to eat")
                .setRequired(false)
                .setMinValue(1),
        ),
    async autocomplete(i) {
        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return i
                .respond([{ name: "No stats found", value: "n/a" }])
                .catch(noop);
        }

        const inventoryItems = stats.inventory
            .filter((item) => food[item.item as FoodName])
            .map((item) => ({ name: item.item, value: item.item }));

        const focusedValue = i.options.getFocused()?.toLowerCase() || "";

        const filteredItems = inventoryItems
            .filter((c) => c.name.toLowerCase().includes(focusedValue))
            .slice(0, 25);

        if (!is.array(filteredItems) || filteredItems.length === 0) {
            return i
                .respond([{ name: "No matching food items", value: "n/a" }])
                .catch(noop);
        }

        return i.respond(filteredItems).catch(noop);
    },
    defer: { silent: false },
    async execute(i, r) {
        const itemName = i.options.getString("item", true);
        const amountToEat = i.options.getInteger("amount", false) ?? 1;

        if (itemName === "n/a") {
            return r.edit(embedComment(`You didn't select a valid food item.`));
        }

        const foodItem = food[itemName as FoodName];

        if (!foodItem) {
            return r.edit(
                embedComment(
                    `The item "${itemName}" is not a consumable food item.`,
                ),
            );
        }

        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        if (stats.isHunting) {
            return r.edit(embedComment("You cannot eat while hunting!"));
        }

        const inventoryItem = stats.inventory.find(
            (item) => item.item === itemName,
        );

        if (!inventoryItem || inventoryItem.amount < amountToEat) {
            return r.edit(
                embedComment(
                    `You don't have enough "${itemName}" to eat.\nYou need \`${amountToEat}x\` ${itemName}.`,
                ),
            );
        }

        const maxHP = stats.maxHP;
        const healPercentage = foodItem.healAmount / 100;
        const healPerItem = Math.ceil(maxHP * healPercentage);
        const totalHealAmount = healPerItem * amountToEat;
        const newHp = Math.min(stats.hp + totalHealAmount, maxHP);

        if (stats.hp >= maxHP) {
            return r.edit(embedComment("Your HP is already at maximum."));
        }

        inventoryItem.amount -= amountToEat;
        if (inventoryItem.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (item) => item.item !== itemName,
            );
        }

        await updateUserStats(i.user.id, {
            hp: newHp,
            inventory: { set: stats.inventory },
        });

        return r.edit(
            embedComment(
                `You ate \`${amountToEat}x\` **${itemName}** and restored \`❤️\` \`${totalHealAmount} HP\`!\nYour current HP is \`${newHp}/${maxHP}\`.`,
                "Green",
            ),
        );
    },
});
