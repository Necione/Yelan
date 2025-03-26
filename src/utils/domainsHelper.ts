interface Domain {
    requiredRebirths: number;
    monsterPool: string[];
    monsterCount: number;
    description: string;
    disabledSkills: string[];
    reward: {
        coins: number;
        extraItems?: {
            item: string;
            amount: number;
            chance: number;
        }[];
    };
}

export const domains: Record<string, Domain> = {
    "Cecilia Garden": {
        requiredRebirths: 1,
        monsterPool: [
            "Dendro Slime",
            "Hydro Abyss Mage",
            "Treasure Hoarder Gravedigger",
            "Treasure Hoarder Marksman",
            "Treasure Hoarder Crusher",
            "Hydro Slime",
            "Dendro Samachurl",
            "Stonehide Lawachurl",
        ],
        monsterCount: 3,
        description:
            "A serene garden filled with Cecilia flowers, now corrupted by monsters.",
        disabledSkills: ["Leech", "Backstep", "Kindle"],
        reward: {
            coins: 100,
            extraItems: [],
        },
    },
    "Valley of Remembrance": {
        requiredRebirths: 2,
        monsterPool: [
            "Large Geo Slime",
            "Dendro Samachurl",
            "Ruin Cruiser",
            "Ruin Scout",
            "Fatui Hydrogunner",
            "Fatui Pyro Agent",
            "Fatui Vanguard",
            "Eremite: Clearwater",
            "Eremite: Sunfrost",
        ],
        monsterCount: 3,
        description:
            "Ancient ruins where memories of the past linger, guarded by mechanical sentinels.",
        disabledSkills: ["Vigilance", "Distraction", "Paladin"],
        reward: {
            coins: 150,
            extraItems: [],
        },
    },
    "City of Gold": {
        requiredRebirths: 3,
        monsterPool: [
            "Fatui Pyro Agent|Infected",
            "Fathomless Flames",
            "Wicked Torrents",
            "Violet Lightning",
            "Frost Fall",
            "Electro Cicin|Strange",
            "Ruin Guard|Strange",
            "Nobushi: Jintouban",
            "Nobushi: Kikouban",
        ],
        monsterCount: 4,
        description:
            "The legendary golden city, now a battleground for treasure seekers.",
        disabledSkills: ["Wrath", "Spice", "Drain"],
        reward: {
            coins: 200,
            extraItems: [
                {
                    item: "Gold Seal",
                    amount: 1,
                    chance: 100,
                },
            ],
        },
    },
    "Ridge Watch": {
        requiredRebirths: 4,
        monsterPool: [
            "Cryo Specter|Bloodthirsty",
            "Kairagi: Fiery Might|Strange",
            "Eremite: Galehunter|Strange",
            "Eremite: Dayhunter|Bloodthirsty",
            "Eremite: Axe Vanguard|Poisonous",
            "Ruin Destroyer|Hard",
        ],
        monsterCount: 4,
        description: "A treacherous mountain pass where ancient beasts roam.",
        disabledSkills: ["Crystallize", "Vigor", "Sting"],
        reward: {
            coins: 250,
            extraItems: [
                {
                    item: "Ridge Seal",
                    amount: 1,
                    chance: 100,
                },
            ],
        },
    },
    "Slumbering Court": {
        requiredRebirths: 5,
        monsterPool: [
            "Kairagi: Dancing Thunder|Infected",
            "Kairagi: Fiery Might|Hard",
            "Electro Specter|Strange",
            "Pyro Specter|Strange",
            "Ruin Hunter|Bloodthirsty",
            "Cryo Cicin|Infected",
            "Ruin Hunter|Strange",
        ],
        monsterCount: 4,
        description:
            "A mysterious court where dark energy seeps from the depths.",
        disabledSkills: ["Vigilance", "Wrath", "Paladin"],
        reward: {
            coins: 300,
            extraItems: [
                {
                    item: "Court Seal",
                    amount: 1,
                    chance: 100,
                },
            ],
        },
    },
    "The Lost Valley": {
        requiredRebirths: 6,
        monsterPool: [
            "Hydro Cicin|Hard",
            "Dendro Specter|Poisonous",
            "Red Vulture|Demonic",
            "Red Vulture|Strange",
            "Geo Specter|Demonic",
            "Scorpion|Strange",
            "Hydro Samachurl|Strange",
            "Rockfond Rifthound|Demonic",
            "Eremite: Loremaster|Poisonous",
            "Eremite: Loremaster|Demonic",
        ],
        monsterCount: 4,
        description:
            "A forgotten valley where ancient machines and dark warriors dwell.",
        disabledSkills: ["Fatigue", "Sloth", "Fortress"],
        reward: {
            coins: 350,
            extraItems: [
                {
                    item: "Valley Relic",
                    amount: 1,
                    chance: 100,
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
            ],
        },
    },
    "Violet Court": {
        requiredRebirths: 7,
        monsterPool: [
            "Fanged Beast|Demonic",
            "Flying Serpent|Demonic",
            "Fanged Beast|Strange",
            "Flying Serpent|Infected",
            "Rockfond Rifthound|Poisonous",
            "Dendro Specter|Hard",
            "Scorpion|Strange",
            "Red Vulture|Demonic",
        ],
        monsterCount: 4,
        description:
            "The most challenging domain, where only the strongest warriors dare to venture.",
        disabledSkills: ["Sting", "Drain", "Fortress"],
        reward: {
            coins: 400,
            extraItems: [
                {
                    item: "Violet Seal",
                    amount: 1,
                    chance: 100,
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
            ],
        },
    },
};
