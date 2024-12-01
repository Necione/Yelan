import { make } from "@elara-services/utils";

export interface Recipe {
    name: string;
    requiredItems: { item: string; amount: number }[];
    result: { item: string; amount: number };
    cookTime: number;
}

export const recipes = make.array<Recipe>([
    {
        name: "Chicken-Mushroom Skewer",
        requiredItems: [
            { item: "Fowl", amount: 1 },
            { item: "Mushroom", amount: 1 },
        ],
        result: { item: "Chicken-Mushroom Skewer", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Sweet Madame",
        requiredItems: [
            { item: "Fowl", amount: 2 },
            { item: "Wheat", amount: 2 },
        ],
        result: { item: "Sweet Madame", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Teyvat Fried Egg",
        requiredItems: [{ item: "Bird Egg", amount: 1 }],
        result: { item: "Teyvat Fried Egg", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Steak",
        requiredItems: [{ item: "Raw Meat", amount: 2 }],
        result: { item: "Steak", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Mondstadt Hash Brown",
        requiredItems: [
            { item: "Pinecone", amount: 2 },
            { item: "Radish", amount: 2 },
            { item: "Carrot", amount: 1 },
        ],
        result: { item: "Mondstadt Hash Brown", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Barbatos Ratatouille",
        requiredItems: [
            { item: "Apple", amount: 2 },
            { item: "Mint", amount: 2 },
        ],
        result: { item: "Barbatos Ratatouille", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Jade Parcels",
        requiredItems: [
            { item: "Lotus Head", amount: 2 },
            { item: "Cabbage", amount: 2 },
            { item: "Matsutake", amount: 1 },
        ],
        result: { item: "Jade Parcels", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Almond Tofu",
        requiredItems: [
            { item: "Berry", amount: 1 },
            { item: "Almond", amount: 1 },
        ],
        result: { item: "Almond Tofu", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Jewelry Soup",
        requiredItems: [
            { item: "Snapdragon", amount: 2 },
            { item: "Violetgrass", amount: 1 },
        ],
        result: { item: "Jewelry Soup", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Matsutake Meat Rolls",
        requiredItems: [
            { item: "Raw Meat", amount: 2 },
            { item: "Matsutake", amount: 1 },
        ],
        result: { item: "Matsutake Meat Rolls", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Golden Crab",
        requiredItems: [
            { item: "Crab", amount: 1 },
            { item: "Bird Egg", amount: 2 },
        ],
        result: { item: "Golden Crab", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Fish and Chips",
        requiredItems: [
            { item: "Fish", amount: 2 },
            { item: "Potato", amount: 2 },
        ],
        result: { item: "Fish and Chips", amount: 1 },
        cookTime: 60000,
    },
]);
