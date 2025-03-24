import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop, snowflakes } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { getPaginatedMessage } from "../../utils";
import { recipes } from "../../utils/recipes";

interface CookedItem {
    name: string;
    amount: number;
}

export const cook = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("cook")
        .setDescription("[RPG] Cook recipes to create food items.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("recipe")
                .setDescription("The recipe you want to cook")
                .setRequired(false)
                .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The number of times to cook the recipe")
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

        const focusedValue = i.options.getFocused()?.toLowerCase() || "";

        const availableRecipes = recipes.filter((recipe) => {
            return recipe.requiredItems.every((required) => {
                const inventoryItem = stats.inventory.find(
                    (item) => item.item === required.item,
                );
                return inventoryItem && inventoryItem.amount >= required.amount;
            });
        });

        const choices = availableRecipes
            .filter((recipe) =>
                recipe.name.toLowerCase().includes(focusedValue),
            )
            .map((recipe) => ({
                name: recipe.name,
                value: recipe.name,
            }));

        return i.respond(choices.slice(0, 25)).catch(noop);
    },
    defer: { silent: false },
    async execute(i, r) {
        const recipeName = i.options.getString("recipe", false);
        const amountToCook = i.options.getInteger("amount", false) ?? 1;

        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        if (stats.isHunting || stats.abyssMode) {
            return r.edit(embedComment("You cannot cook right now!"));
        }

        const currentTime = new Date();
        const cookedItems: CookedItem[] = [];
        if (stats.cooking && stats.cooking.length > 0) {
            const remainingCooking = [];
            for (const cookingItem of stats.cooking) {
                if (currentTime >= cookingItem.finishTime) {
                    const recipe = recipes.find(
                        (r) => r.name === cookingItem.recipeName,
                    );
                    if (recipe) {
                        const existingItem = stats.inventory.find(
                            (item) => item.item === recipe.result.item,
                        );
                        if (existingItem) {
                            existingItem.amount +=
                                recipe.result.amount * cookingItem.amount;
                        } else {
                            stats.inventory.push({
                                id: snowflakes.generate(),
                                item: recipe.result.item,
                                amount:
                                    recipe.result.amount * cookingItem.amount,
                                metadata: null,
                            });
                        }
                        cookedItems.push({
                            name: recipe.result.item,
                            amount: recipe.result.amount * cookingItem.amount,
                        });
                    }
                } else {
                    remainingCooking.push(cookingItem);
                }
            }
            stats.cooking = remainingCooking;

            await updateUserStats(i.user.id, {
                inventory: { set: stats.inventory },
                cooking: { set: stats.cooking },
            });
        }

        if (!recipeName) {
            const pager = getPaginatedMessage();

            const currentCookingEmbed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("Current Cooking Status")
                .setThumbnail("https://lh.elara.workers.dev/rpg/cooking.png");

            let description = "";
            if (cookedItems.length > 0) {
                const cookedItemsList = cookedItems
                    .map((item) => `\`${item.amount}x\` **${item.name}**`)
                    .join(", ");
                description += `Your cooking is done! You received ${cookedItemsList}.\n\n`;
            }

            if (stats.cooking && stats.cooking.length > 0) {
                description += "**Currently Cooking:**\n";
                description += stats.cooking
                    .map((cookingItem) => {
                        const finishTimestamp = `<t:${Math.floor(
                            cookingItem.finishTime.getTime() / 1000,
                        )}:R>`;
                        return `**${cookingItem.recipeName}** x${cookingItem.amount} - Ready ${finishTimestamp}`;
                    })
                    .join("\n");
            } else if (cookedItems.length === 0) {
                description += "You are not cooking anything currently.";
            }

            currentCookingEmbed.setDescription(description);

            const recipesEmbed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("Available Recipes")
                .setThumbnail("https://lh.elara.workers.dev/rpg/recipes.png");

            const recipeList = recipes
                .map((recipe) => {
                    const canCook = recipe.requiredItems.every((required) => {
                        const inventoryItem = stats.inventory.find(
                            (item) => item.item === required.item,
                        );
                        return (
                            inventoryItem &&
                            inventoryItem.amount >= required.amount
                        );
                    });

                    const ingredients = recipe.requiredItems
                        .map((item) => `${item.amount}x ${item.item}`)
                        .join(", ");

                    return `${canCook ? "✅" : "❌"} **${
                        recipe.name
                    }**\n└ Requires: ${ingredients}`;
                })
                .join("\n\n");

            recipesEmbed.setDescription(recipeList);

            pager.pages.push({ embeds: [currentCookingEmbed] });
            pager.pages.push({ embeds: [recipesEmbed] });

            return pager.run(i, i.user).catch(noop);
        }

        const recipe = recipes.find(
            (r) => r.name.toLowerCase() === recipeName.toLowerCase(),
        );

        if (!recipe) {
            return r.edit(
                embedComment(`The recipe "${recipeName}" does not exist.`),
            );
        }

        const currentCookingCount = stats.cooking ? stats.cooking.length : 0;
        if (currentCookingCount >= 3) {
            return r.edit(
                embedComment(
                    "You are already cooking 3 items. Please wait for them to finish.",
                ),
            );
        }

        for (const requiredItem of recipe.requiredItems) {
            const inventoryItem = stats.inventory.find(
                (item) => item.item === requiredItem.item,
            );
            if (
                !inventoryItem ||
                inventoryItem.amount < requiredItem.amount * amountToCook
            ) {
                return r.edit(
                    embedComment(
                        `You don't have enough **${
                            requiredItem.item
                        }** to cook **${recipe.name}**.\nYou need \`${
                            requiredItem.amount * amountToCook
                        }x\` ${requiredItem.item}.`,
                    ),
                );
            }

            inventoryItem.amount -= requiredItem.amount * amountToCook;
            if (inventoryItem.amount <= 0) {
                stats.inventory = stats.inventory.filter(
                    (item) => item.item !== inventoryItem.item,
                );
            }
        }

        const finishTime = new Date(Date.now() + recipe.cookTime);

        if (!stats.cooking) {
            stats.cooking = [];
        }
        stats.cooking.push({
            recipeName: recipe.name,
            amount: amountToCook,
            finishTime,
        });

        await updateUserStats(i.user.id, {
            inventory: { set: stats.inventory },
            cooking: { set: stats.cooking },
        });

        const finishTimestamp = `<t:${Math.floor(
            finishTime.getTime() / 1000,
        )}:R>`;

        return r.edit(
            embedComment(
                `You started cooking \`${amountToCook}x\` **${recipe.name}**.\nIt will be ready ${finishTimestamp}.`,
            ),
        );
    },
});
