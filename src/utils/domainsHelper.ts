interface Domain {
    requiredRebirths: number;
    monsters: string[];
    description: string;
    disabledSkills: string[];
    reward: {
        coins: number;
        items: {
            item: string;
            amount: number;
            chance: number;
        }[];
    };
}

export const domains: Record<string, Domain> = {
    "Cecilia Garden": {
        requiredRebirths: 1,
        monsters: [
            "Dendro Slime",
            "Hydro Abyss Mage",
            "Hydro Abyss Mage",
            "Treasure Hoarder Gravedigger",
        ],
        description:
            "A serene garden filled with Cecilia flowers, now corrupted by monsters.",
        disabledSkills: ["Leech", "Backstep", "Kindle"],
        reward: {
            coins: 100,
            items: [
                {
                    item: "Violetgrass",
                    amount: 3,
                    chance: 100,
                },
                {
                    item: "Life Essence",
                    amount: 1,
                    chance: 50,
                },
                {
                    item: "Slime Condensate",
                    amount: 2,
                    chance: 80,
                },
                {
                    item: "Damaged Mask",
                    amount: 2,
                    chance: 70,
                },
                {
                    item: "Firm Arrowhead",
                    amount: 2,
                    chance: 60,
                },
            ],
        },
    },
    "Valley of Remembrance": {
        requiredRebirths: 2,
        monsters: [
            "Large Geo Slime|Hard",
            "Dendro Samachurl",
            "Ruin Cruiser|Strange",
        ],
        description:
            "Ancient ruins where memories of the past linger, guarded by mechanical sentinels.",
        disabledSkills: ["Vigilance", "Distraction", "Paladin"],
        reward: {
            coins: 150,
            items: [
                {
                    item: "Dismal Prism",
                    amount: 5,
                    chance: 90,
                },
                {
                    item: "A Flower Yet to Bloom",
                    amount: 1,
                    chance: 70,
                },
                {
                    item: "Life Essence",
                    amount: 1,
                    chance: 50,
                },
                {
                    item: "Slime Secretions",
                    amount: 2,
                    chance: 75,
                },
                {
                    item: "Stained Mask",
                    amount: 2,
                    chance: 65,
                },
                {
                    item: "Sharp Arrowhead",
                    amount: 2,
                    chance: 55,
                },
            ],
        },
    },
    "City of Gold": {
        requiredRebirths: 3,
        monsters: [
            "Fatui Pyro Agent|Infected",
            "Fathomless Flames",
            "Wicked Torrents",
            "Electro Cicin|Strange",
        ],
        description:
            "The legendary golden city, now a battleground for treasure seekers.",
        disabledSkills: ["Wrath", "Spice", "Drain"],
        reward: {
            coins: 200,
            items: [
                {
                    item: "Gold Seal",
                    amount: 1,
                    chance: 100,
                },
                {
                    item: "Geode",
                    amount: 1,
                    chance: 20,
                },
                {
                    item: "Life Essence",
                    amount: 1,
                    chance: 50,
                },
                {
                    item: "Slime Concentrate",
                    amount: 2,
                    chance: 70,
                },
                {
                    item: "Ominous Mask",
                    amount: 2,
                    chance: 60,
                },
                {
                    item: "Weathered Arrowhead",
                    amount: 2,
                    chance: 50,
                },
            ],
        },
    },
    "Ridge Watch": {
        requiredRebirths: 4,
        monsters: [
            "Cryo Specter|Bloodthirsty",
            "Kairagi: Fiery Might|Strange",
            "Kairagi: Fiery Might|Strange",
            "Ruin Destroyer|Hard",
        ],
        description: "A treacherous mountain pass where ancient beasts roam.",
        disabledSkills: ["Crystallize", "Vigor", "Sting"],
        reward: {
            coins: 250,
            items: [
                {
                    item: "Ridge Seal",
                    amount: 1,
                    chance: 100,
                },
                {
                    item: "Vishap Scale",
                    amount: 1,
                    chance: 40,
                },
                {
                    item: "Life Essence",
                    amount: 1,
                    chance: 50,
                },
                {
                    item: "Skill Token",
                    amount: 1,
                    chance: 10,
                },
                {
                    item: "Heavy Horn",
                    amount: 2,
                    chance: 65,
                },
                {
                    item: "Black Bronze Horn",
                    amount: 2,
                    chance: 55,
                },
                {
                    item: "Treasure Hoarder Insignia",
                    amount: 2,
                    chance: 45,
                },
            ],
        },
    },
    "Slumbering Court": {
        requiredRebirths: 5,
        monsters: [
            "Kairagi: Dancing Thunder|Demonic",
            "Nobushi: Hitsukeban",
            "Nobushi: Hitsukeban",
            "Eremite: Galehunter",
        ],
        description:
            "A mysterious court where dark energy seeps from the depths.",
        disabledSkills: ["Vigilance", "Wrath", "Paladin"],
        reward: {
            coins: 300,
            items: [
                {
                    item: "Court Seal",
                    amount: 1,
                    chance: 100,
                },
                {
                    item: "Life Essence",
                    amount: 1,
                    chance: 50,
                },
                {
                    item: "Skill Token",
                    amount: 1,
                    chance: 10,
                },
                {
                    item: "Black Crystal Horn",
                    amount: 2,
                    chance: 60,
                },
                {
                    item: "Silver Raven Insignia",
                    amount: 2,
                    chance: 50,
                },
                {
                    item: "Dead Ley Line Branch",
                    amount: 2,
                    chance: 40,
                },
            ],
        },
    },
    "The Lost Valley": {
        requiredRebirths: 6,
        monsters: [
            "Hydro Cicin|Hard",
            "Dendro Specter|Poisonous",
            "Red Vulture|Demonic",
        ],
        description:
            "A forgotten valley where ancient machines and dark warriors dwell.",
        disabledSkills: ["Fatigue", "Sloth", "Fortress"],
        reward: {
            coins: 350,
            items: [
                {
                    item: "Valley Relic",
                    amount: 1,
                    chance: 100,
                },
                {
                    item: "Scattered Star",
                    amount: 1,
                    chance: 50,
                },
                {
                    item: "Life Essence",
                    amount: 1,
                    chance: 50,
                },
                {
                    item: "Thundering Poise",
                    amount: 1,
                    chance: 25,
                },
                {
                    item: "Skill Token",
                    amount: 1,
                    chance: 10,
                },
                {
                    item: "Golden Raven Insignia",
                    amount: 2,
                    chance: 55,
                },
                {
                    item: "Dead Ley Line Leaves",
                    amount: 2,
                    chance: 45,
                },
                {
                    item: "Recruit's Insignia",
                    amount: 2,
                    chance: 35,
                },
            ],
        },
    },
    "Violet Court": {
        requiredRebirths: 7,
        monsters: [
            "Fanged Beast|Demonic",
            "Flying Serpent|Demonic",
            "Rockfond Rifthound|Poisonous",
            "Eremite: Clearwater|Strange",
        ],
        description:
            "The most challenging domain, where only the strongest warriors dare to venture.",
        disabledSkills: ["Sting", "Drain", "Fortress"],
        reward: {
            coins: 400,
            items: [
                {
                    item: "Violet Seal",
                    amount: 1,
                    chance: 100,
                },
                {
                    item: "Scattered Star",
                    amount: 1,
                    chance: 70,
                },
                {
                    item: "Life Essence",
                    amount: 1,
                    chance: 50,
                },
                {
                    item: "Flowering Life",
                    amount: 1,
                    chance: 25,
                },
                {
                    item: "Skill Token",
                    amount: 1,
                    chance: 10,
                },
                {
                    item: "Crystal Prism",
                    amount: 2,
                    chance: 40,
                },
                {
                    item: "Mist Grass",
                    amount: 2,
                    chance: 35,
                },
            ],
        },
    },
};
