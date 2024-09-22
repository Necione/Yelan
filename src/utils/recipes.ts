export interface Recipe {
    name: string;
    requiredItems: { item: string; amount: number }[];
    result: { item: string; amount: number };
    cookTime: number;
}

export const recipes: Recipe[] = [
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
            { item: "Sweet Flower", amount: 2 },
        ],
        result: { item: "Sweet Madame", amount: 1 },
        cookTime: 120000,
    },
    {
        name: "Teyvat Fried Egg",
        requiredItems: [{ item: "Bird Egg", amount: 1 }],
        result: { item: "Teyvat Fried Egg", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Steak",
        requiredItems: [{ item: "Raw Meat", amount: 1 }],
        result: { item: "Steak", amount: 1 },
        cookTime: 60000,
    },
    {
        name: "Fisherman's Toast",
        requiredItems: [
            { item: "Flour", amount: 3 },
            { item: "Tomato", amount: 2 },
            { item: "Milk", amount: 1 },
        ],
        result: { item: "Fisherman's Toast", amount: 1 },
        cookTime: 180000,
    },
    {
        name: "Mondstadt Hash Brown",
        requiredItems: [
            { item: "Pinecone", amount: 3 },
            { item: "Potato", amount: 3 },
            { item: "Jam", amount: 1 },
        ],
        result: { item: "Mondstadt Hash Brown", amount: 1 },
        cookTime: 240000,
    },
    {
        name: "Mushroom Pizza",
        requiredItems: [
            { item: "Flour", amount: 3 },
            { item: "Cheese", amount: 1 },
            { item: "Cabbage", amount: 2 },
            { item: "Mushroom", amount: 4 },
            { item: "Tomato", amount: 2 },
        ],
        result: { item: "Mushroom Pizza", amount: 1 },
        cookTime: 300000,
    },
    {
        name: "Fried Radish Balls",
        requiredItems: [
            { item: "Radish", amount: 3 },
            { item: "Flour", amount: 2 },
        ],
        result: { item: "Fried Radish Balls", amount: 1 },
        cookTime: 120000,
    },
    {
        name: "Cream Stew",
        requiredItems: [
            { item: "Raw Meat", amount: 2 },
            { item: "Cream", amount: 2 },
            { item: "Snapdragon", amount: 1 },
            { item: "Carrot", amount: 2 },
        ],
        result: { item: "Cream Stew", amount: 1 },
        cookTime: 240000,
    },
    {
        name: "Barbatos Ratatouille",
        requiredItems: [
            { item: "Carrot", amount: 4 },
            { item: "Mint", amount: 2 },
        ],
        result: { item: "Barbatos Ratatouille", amount: 1 },
        cookTime: 180000,
    },
    {
        name: "Calla Lily Seafood Soup",
        requiredItems: [
            { item: "Calla Lily", amount: 1 },
            { item: "Crab", amount: 2 },
            { item: "Mint", amount: 1 },
        ],
        result: { item: "Calla Lily Seafood Soup", amount: 1 },
        cookTime: 240000,
    },
    {
        name: "Jade Parcels",
        requiredItems: [
            { item: "Lotus Head", amount: 3 },
            { item: "Cabbage", amount: 2 },
            { item: "Ham", amount: 1 },
            { item: "Jueyun Chili", amount: 1 },
        ],
        result: { item: "Jade Parcels", amount: 1 },
        cookTime: 360000,
    },
    {
        name: "Universal Peace",
        requiredItems: [
            { item: "Rice", amount: 4 },
            { item: "Lotus Head", amount: 2 },
            { item: "Carrot", amount: 2 },
            { item: "Cabbage", amount: 2 },
        ],
        result: { item: "Universal Peace", amount: 1 },
        cookTime: 300000,
    },
    {
        name: "Almond Tofu",
        requiredItems: [
            { item: "Milk", amount: 3 },
            { item: "Sugar", amount: 1 },
            { item: "Almond", amount: 1 },
        ],
        result: { item: "Almond Tofu", amount: 1 },
        cookTime: 180000,
    },
    {
        name: "Goulash",
        requiredItems: [
            { item: "Chilled Meat", amount: 2 },
            { item: "Tomato", amount: 2 },
            { item: "Carrot", amount: 2 },
        ],
        result: { item: "Goulash", amount: 1 },
        cookTime: 240000,
    },
    {
        name: "Golden Shrimp Balls",
        requiredItems: [
            { item: "Rice", amount: 4 },
            { item: "Shrimp Meat", amount: 3 },
            { item: "Potato", amount: 2 },
            { item: "Flour", amount: 1 },
        ],
        result: { item: "Golden Shrimp Balls", amount: 1 },
        cookTime: 360000,
    },
    {
        name: "Jewelry Soup",
        requiredItems: [
            { item: "Snapdragon", amount: 2 },
            { item: "Tofu", amount: 2 },
            { item: "Lotus Head", amount: 1 },
            { item: "Salt", amount: 1 },
        ],
        result: { item: "Jewelry Soup", amount: 1 },
        cookTime: 240000,
    },
    {
        name: "Matsutake Meat Rolls",
        requiredItems: [
            { item: "Raw Meat", amount: 2 },
            { item: "Matsutake", amount: 2 },
        ],
        result: { item: "Matsutake Meat Rolls", amount: 1 },
        cookTime: 180000,
    },
    {
        name: "Crab Roe Tofu",
        requiredItems: [
            { item: "Crab Roe", amount: 1 },
            { item: "Tofu", amount: 2 },
            { item: "Cream", amount: 1 },
            { item: "Salt", amount: 1 },
        ],
        result: { item: "Crab Roe Tofu", amount: 1 },
        cookTime: 300000,
    },
];
