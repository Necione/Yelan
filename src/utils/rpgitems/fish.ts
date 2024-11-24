export type FishRarity = "Common" | "Rare" | "Epic" | "Legendary";

export interface FishData {
    rarity: FishRarity;
    fishingLevel: number;
    weight: number;
    emoji: string;
    sellPrice: number;
    rods: string[];
    minReels: number;
    maxReels: number;
}

export const fish: { [key: string]: FishData } = {
    Betta: {
        rarity: "Common",
        fishingLevel: 1,
        weight: 50,
        emoji: "<:Item_Betta:1309015028757692516>",
        sellPrice: 15,
        rods: [
            "Wilderness Rod",
            "Wishmaker",
            "Narukawa Ukai",
            "Wavepiercer",
            "Moonstringer",
            "Windtangler",
            "Serendipity",
        ],
        minReels: 1,
        maxReels: 2,
    },
    "Lunged Stickleback": {
        rarity: "Common",
        fishingLevel: 1,
        weight: 50,
        emoji: "<:Item_Lunged_Stickleback:1309015142335516773>",
        sellPrice: 20,
        rods: [
            "Wilderness Rod",
            "Wishmaker",
            "Narukawa Ukai",
            "Wavepiercer",
            "Moonstringer",
            "Windtangler",
            "Serendipity",
        ],
        minReels: 1,
        maxReels: 2,
    },
    Medaka: {
        rarity: "Common",
        fishingLevel: 1,
        weight: 50,
        emoji: "<:Item_Medaka:1309018341184110745>",
        sellPrice: 25,
        rods: [
            "Wilderness Rod",
            "Wishmaker",
            "Narukawa Ukai",
            "Wavepiercer",
            "Moonstringer",
            "Windtangler",
            "Serendipity",
        ],
        minReels: 1,
        maxReels: 3,
    },
    "Venomspine Fish": {
        rarity: "Common",
        fishingLevel: 2,
        weight: 50,
        emoji: "<:Item_Venomspine_Fish:1309557115282653294>",
        sellPrice: 30,
        rods: [
            "Wilderness Rod",
            "Wishmaker",
            "Narukawa Ukai",
            "Wavepiercer",
            "Moonstringer",
            "Windtangler",
            "Serendipity",
        ],
        minReels: 2,
        maxReels: 4,
    },
    "Golden Koi": {
        rarity: "Rare",
        fishingLevel: 2,
        weight: 30,
        emoji: "<:Item_Golden_Koi:1309018445634994217>",
        sellPrice: 75,
        rods: [
            "Wilderness Rod",
            "Wishmaker",
            "Narukawa Ukai",
            "Wavepiercer",
            "Moonstringer",
            "Windtangler",
            "Serendipity",
        ],
        minReels: 3,
        maxReels: 5,
    },
    "Abiding Angelfish": {
        rarity: "Epic",
        fishingLevel: 3,
        weight: 15,
        emoji: "<:Item_Abiding_Angelfish:1309018690775420978>",
        sellPrice: 125,
        rods: [
            "Wilderness Rod",
            "Wishmaker",
            "Narukawa Ukai",
            "Wavepiercer",
            "Moonstringer",
            "Windtangler",
            "Serendipity",
        ],
        minReels: 4,
        maxReels: 6,
    },
    Snowstrider: {
        rarity: "Legendary",
        fishingLevel: 5,
        weight: 1,
        emoji: "<:Item_Snowstrider:1309018556888776787>",
        sellPrice: 500,
        rods: [
            "Wilderness Rod",
            "Wishmaker",
            "Narukawa Ukai",
            "Wavepiercer",
            "Moonstringer",
            "Windtangler",
            "Serendipity",
        ],
        minReels: 5,
        maxReels: 7,
    },
};

export type FishName = keyof typeof fish;

export const fishList: (FishData & { name: string })[] = Object.entries(
    fish,
).map(([name, data]) => ({ name, ...data }));
