export type SkillName =
    | "Vigilance"
    | "Leech"
    | "Vampirism"
    | "Appraise"
    | "Totem"
    | "Insomnia"
    | "Kindle"
    | "Scrounge"
    | "Energize"
    | "Distraction"
    | "Backstab"
    | "Heartbroken"
    | "Crystallize"
    | "Growth"
    | "Sloth"
    | "Wrath";

export interface Skill {
    name: SkillName;
    description: string;
    emoji: string;
    requirements?: {
        worldLevel: number;
        coins: number;
        items: { item: string; amount: number }[];
        rebirthsRequired?: number;
    };
}

export const skills: Skill[] = [
    {
        name: "Vigilance",
        description:
            "Attack twice at the start of battle, the second attack dealing 50% your base ATK",
        emoji: "✨",
        requirements: {
            worldLevel: 2,
            coins: 100,
            items: [
                { item: "Ominous Mask", amount: 2 },
                { item: "Divining Scroll", amount: 3 },
            ],
        },
    },
    {
        name: "Leech",
        description:
            "Gain 5% lifesteal from each enemy's Max HP 50% of the time",
        emoji: "💖",
        requirements: {
            worldLevel: 3,
            coins: 150,
            items: [{ item: "Slime Concentrate", amount: 2 }],
        },
    },
    {
        name: "Appraise",
        description: "Sell things for a little bit more than they're worth",
        emoji: "🔍",
        requirements: {
            worldLevel: 1,
            coins: 100,
            items: [
                { item: "Slime Condensate", amount: 2 },
                { item: "Sharp Arrowhead", amount: 2 },
            ],
        },
    },
    {
        name: "Totem",
        description: "Heal 5% of your Max HP after every battle",
        emoji: "⭐",
        requirements: {
            worldLevel: 1,
            coins: 100,
            items: [{ item: "Stained Mask", amount: 5 }],
        },
    },
    {
        name: "Insomnia",
        description: "Reduce your hunt cooldown from 30 minutes to 20 minutes",
        emoji: "🌙",
        requirements: {
            worldLevel: 4,
            coins: 150,
            items: [
                { item: "Firm Arrowhead", amount: 3 },
                { item: "Sealed Scroll", amount: 5 },
            ],
        },
    },
    {
        name: "Kindle",
        description: "Deal 10% of your Max HP as bonus damage per turn",
        emoji: "💥",
        requirements: {
            worldLevel: 5,
            coins: 200,
            items: [
                { item: "Forbidden Curse Scroll", amount: 2 },
                { item: "Heavy Horn", amount: 5 },
                { item: "Silver Raven Insignia", amount: 3 },
            ],
        },
    },
    {
        name: "Scrounge",
        description: "In addition to drops, earn coins per hunt",
        emoji: "💸",
        requirements: {
            worldLevel: 3,
            coins: 250,
            items: [
                { item: "Sealed Scroll", amount: 3 },
                { item: "Slime Concentrate", amount: 5 },
            ],
        },
    },
    {
        name: "Energize",
        description:
            "Reduce your explore cooldown from 20 minutes to 15 minutes",
        emoji: "⚡",
        requirements: {
            worldLevel: 5,
            coins: 250,
            items: [
                { item: "Ominous Mask", amount: 5 },
                { item: "Sealed Scroll", amount: 10 },
            ],
        },
    },
    {
        name: "Distraction",
        description: "Go first 75% of the time when hunting",
        emoji: "💫",
        requirements: {
            worldLevel: 10,
            coins: 300,
            items: [{ item: "Dismal Prism", amount: 2 }],
        },
    },
    {
        name: "Backstab",
        description: "Deal 150% more DMG to humans",
        emoji: "🔪",
        requirements: {
            worldLevel: 10,
            rebirthsRequired: 1,
            coins: 150,
            items: [
                { item: "Golden Raven Insignia", amount: 2 },
                { item: "Sealed Scroll", amount: 1 },
            ],
        },
    },
    {
        name: "Vampirism",
        description: "Gain 3% lifesteal from each enemy's Max HP on victory",
        emoji: "🦇",
        requirements: {
            worldLevel: 15,
            rebirthsRequired: 1,
            coins: 250,
            items: [
                { item: "Slime Concentrate", amount: 10 },
                { item: "Sergeant's Insignia", amount: 5 },
            ],
        },
    },
    {
        name: "Growth",
        description: "Earn 150% more EXP at the end of each battle",
        emoji: "🌱",
        requirements: {
            worldLevel: 10,
            rebirthsRequired: 2,
            coins: 500,
            items: [
                { item: "Black Bronze Horn", amount: 5 },
                { item: "Dead Ley Line Leaves", amount: 10 },
            ],
        },
    },
    {
        name: "Heartbroken",
        description: "Deal 1/4 of your HP as bonus DMG on your first turn",
        emoji: "💔",
        requirements: {
            worldLevel: 10,
            rebirthsRequired: 2,
            coins: 150,
            items: [
                { item: "Mist Grass", amount: 2 },
                { item: "Agent's Sacrificial Knife", amount: 2 },
            ],
        },
    },
    {
        name: "Crystallize",
        description: "Monsters deal less DMG early, but more later on",
        emoji: "🧊",
        requirements: {
            worldLevel: 10,
            rebirthsRequired: 2,
            coins: 150,
            items: [
                { item: "Recruit's Insignia", amount: 5 },
                { item: "A Flower Yet to Bloom", amount: 5 },
                { item: "Slime Secretions", amount: 15 },
            ],
        },
    },
    {
        name: "Sloth",
        description: "Start each round with 125% your current HP",
        emoji: "💤",
        requirements: {
            worldLevel: 15,
            rebirthsRequired: 2,
            coins: 500,
            items: [
                { item: "Mist Grass", amount: 10 },
                { item: "Slime Concentrate", amount: 20 },
                { item: "Life Essence", amount: 5 },
            ],
        },
    },
    {
        name: "Wrath",
        description: "Deal 150% more DMG, start each round with 25% less HP",
        emoji: "💢",
        requirements: {
            worldLevel: 15,
            rebirthsRequired: 2,
            coins: 500,
            items: [
                { item: "Crystal Prism", amount: 10 },
                { item: "Slime Concentrate", amount: 20 },
                { item: "Life Essence", amount: 5 },
            ],
        },
    },
];

export const skillsMap: Record<SkillName, Skill> = skills.reduce(
    (map, skill) => {
        map[skill.name] = skill;
        return map;
    },
    {} as Record<SkillName, Skill>,
);
