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
            "Geo Slime",
            "Large Pyro Slime",
            "Anemo Hilichurl Rogue",
            "Ruin Scout",
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
            "Fatui Vanguard",
            "Fatui Hydrogunner",
            "Fatui Pyro Agent|Bloodthirsty",
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
            "Ruin Hunter|Strange",
            "Frost Fall",
            "Frost Fall",
            "Wicked Torrents",
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
            "Frost Operative|Infected",
            "Wind Operative|Infected",
            "Eremite: Axe Vanguard|Infected",
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
            "Cryo Specter",
            "Nobushi: Hitsukeban",
            "Nobushi: Kikouban|Demonic",
            "Ruin Destoyer|Hard",
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
            "Kairagi: Fiery Might|Hard",
            "Geo Specter",
            "Geo Specter",
            "Geo Specter",
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
                    item: "Moment of the Pact",
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
            "Red Vulture|Demonic",
            "Scorpion|Demonic",
            "Dendro Specter|Poisonous",
            "Rockfond Rifthound|Hard",
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
                    item: "Feather of Nascent Light",
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
