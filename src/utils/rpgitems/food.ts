export const food = {
    "Chicken-Mushroom Skewer": {
        sellAmount: 5,
        healAmount: 10,
    },
    "Sweet Madame": {
        sellAmount: 10,
        healAmount: 30,
    },
    "Teyvat Fried Egg": {
        sellAmount: 3,
        healAmount: 25,
    },
    Steak: {
        sellAmount: 3,
        healAmount: 20,
    },
    "Mondstadt Hash Brown": {
        sellAmount: 15,
        healAmount: 40,
    },
    "Barbatos Ratatouille": {
        sellAmount: 10,
        healAmount: 30,
    },
    "Jade Parcels": {
        sellAmount: 20,
        healAmount: 100,
    },
    "Almond Tofu": {
        sellAmount: 12,
        healAmount: 75,
    },
    "Jewelry Soup": {
        sellAmount: 10,
        healAmount: 75,
    },
    "Matsutake Meat Rolls": {
        sellAmount: 12,
        healAmount: 32,
    },
    "Golden Crab": {
        sellAmount: 15,
        healAmount: 50,
    },
    "Fish and Chips": {
        sellAmount: 15,
        healAmount: 30,
    },
};

export type FoodName = keyof typeof food;