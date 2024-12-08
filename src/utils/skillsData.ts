import { make } from "@elara-services/utils";
import { type UserStats } from "@prisma/client";

export type SkillName =
    | "Vigilance"
    | "Leech"
    | "Totem"
    | "Insomnia"
    | "Kindle"
    | "Scrounge"
    | "Energize"
    | "Distraction"
    | "Backstab"
    | "Crystallize"
    | "Growth"
    | "Vigor"
    | "Paladin"
    | "Pride"
    | "Fatigue"
    | "Greed"
    | "Sloth"
    | "Wrath";

export interface SkillLevel {
    level: number;
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    levelData?: Record<string, any>;
}

export interface Skill {
    name: SkillName;
    passive: boolean;
    emoji: string;
    levels: SkillLevel[];
    requirements?: {
        worldLevel: number;
        coins: number;
        items: { item: string; amount: number }[];
        rebirthsRequired?: number;
    };
}

export const skills = make.array<Skill>([
    {
        name: "Vigilance",
        passive: false,
        levels: [
            {
                level: 1,
                description:
                    "Attack twice at the start of battle, the second attack dealing **25%** of your ATK",
                levelData: {
                    secondAttackPercentage: 0.25,
                },
            },
            {
                level: 2,
                description:
                    "Attack twice at the start of battle, the second attack dealing **50%** of your ATK",
                levelData: {
                    secondAttackPercentage: 0.5,
                },
            },
            {
                level: 3,
                description:
                    "Attack twice at the start of battle, the second attack dealing **70%** of your ATK",
                levelData: {
                    secondAttackPercentage: 0.7,
                },
            },
        ],
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
        passive: false,
        levels: [
            {
                level: 1,
                description:
                    "Gain **5%** lifesteal from each enemy's Max HP **40%** of the time",
                levelData: {
                    lifestealPercentage: 0.05,
                    triggerChance: 0.25,
                },
            },
            {
                level: 2,
                description:
                    "Gain **10%** lifesteal from each enemy's Max HP **50%** of the time",
                levelData: {
                    lifestealPercentage: 0.1,
                    triggerChance: 0.5,
                },
            },
            {
                level: 3,
                description:
                    "Gain **13%** lifesteal from each enemy's Max HP **55%** of the time",
                levelData: {
                    lifestealPercentage: 0.13,
                    triggerChance: 0.55,
                },
            },
        ],
        emoji: "💖",
        requirements: {
            worldLevel: 3,
            coins: 150,
            items: [{ item: "Slime Concentrate", amount: 2 }],
        },
    },
    {
        name: "Totem",
        passive: false,
        levels: [
            {
                level: 1,
                description: "Heal **10%** of your Max HP after every battle.",
                levelData: {
                    healPercentage: 0.1,
                },
            },
            {
                level: 2,
                description: "Heal **15%** of your Max HP after every battle.",
                levelData: {
                    healPercentage: 0.15,
                },
            },
            {
                level: 3,
                description: "Heal **25%** of your Max HP after every battle.",
                levelData: {
                    healPercentage: 0.25,
                },
            },
        ],
        emoji: "⭐",
        requirements: {
            worldLevel: 1,
            coins: 100,
            items: [{ item: "Stained Mask", amount: 5 }],
        },
    },
    {
        name: "Insomnia",
        passive: true,
        levels: [
            {
                level: 1,
                description:
                    "Reduce your hunt cooldown from 30 minutes to **20 minutes**",
                levelData: {
                    cooldown: 20,
                },
            },
            {
                level: 2,
                description:
                    "Reduce your hunt cooldown from 20 minutes to **15 minutes**",
                levelData: {
                    cooldown: 15,
                },
            },
        ],
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
        passive: false,
        levels: [
            {
                level: 1,
                description:
                    "Deal **10%** of your Max HP as bonus damage per turn",
                levelData: {
                    damageBonus: 0.1,
                },
            },
            {
                level: 2,
                description:
                    "Deal **15%** of your Max HP as bonus damage per turn",
                levelData: {
                    damageBonus: 0.15,
                },
            },
            {
                level: 3,
                description:
                    "Deal **25%** of your Max HP as bonus damage per turn",
                levelData: {
                    damageBonus: 0.25,
                },
            },
        ],
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
        passive: false,
        levels: [
            {
                level: 1,
                description: "In addition to drops, earn coins per hunt",
            },
        ],
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
        passive: true,
        levels: [
            {
                level: 1,
                description:
                    "Reduce your explore cooldown from 30 minutes to **20 minutes**",
                levelData: {
                    cooldown: 20,
                },
            },
            {
                level: 2,
                description:
                    "Reduce your explore cooldown from 20 minutes to **15 minutes**",
                levelData: {
                    cooldown: 15,
                },
            },
        ],
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
        passive: false,
        levels: [
            {
                level: 1,
                description: "Go first **75%** of the time when hunting",
                levelData: {
                    priority: 0.75,
                },
            },
            {
                level: 2,
                description: "Go first **80%** of the time when hunting",
                levelData: {
                    priority: 0.8,
                },
            },
            {
                level: 3,
                description: "Go first **95%** of the time when hunting",
                levelData: {
                    priority: 0.95,
                },
            },
        ],
        emoji: "💫",
        requirements: {
            worldLevel: 10,
            coins: 300,
            items: [{ item: "Dismal Prism", amount: 2 }],
        },
    },
    {
        name: "Backstab",
        passive: false,
        levels: [
            {
                level: 1,
                description: "Deal 150% more DMG to humans",
            },
        ],
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
        name: "Growth",
        passive: false,
        levels: [
            {
                level: 1,
                description: "Earn 150% more EXP at the end of each battle",
            },
        ],
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
        name: "Fatigue",
        passive: false,
        levels: [
            {
                level: 1,
                description: "Monsters deal more DMG early, but less later on",
            },
        ],
        emoji: "🐌",
        requirements: {
            worldLevel: 10,
            rebirthsRequired: 2,
            coins: 150,
            items: [
                { item: "Forbidden Curse Scroll", amount: 3 },
                { item: "Slime Secretions", amount: 10 },
                { item: "Chaos Device", amount: 5 },
            ],
        },
    },
    {
        name: "Crystallize",
        passive: false,
        levels: [
            {
                level: 1,
                description: "Monsters deal less DMG early, but more later on",
            },
        ],
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
        name: "Vigor",
        passive: false,
        levels: [
            {
                level: 1,
                description: "Deal more damage at lower HP",
            },
        ],
        emoji: "💪",
        requirements: {
            worldLevel: 10,
            rebirthsRequired: 2,
            coins: 500,
            items: [
                { item: "Rich Red Brocade", amount: 5 },
                { item: "Golden Raven Insignia", amount: 5 },
                { item: "Slime Concentrate", amount: 10 },
            ],
        },
    },
    {
        name: "Paladin",
        passive: false,
        levels: [
            {
                level: 1,
                description:
                    "Your ATK becomes 50% of your DEF Value, and your DEF Value becomes your ATK.",
            },
        ],
        emoji: "🛡️",
        requirements: {
            worldLevel: 10,
            rebirthsRequired: 2,
            coins: 500,
            items: [
                { item: "Wanderer's Blooming Flower", amount: 3 },
                { item: "Mist Grass", amount: 10 },
            ],
        },
    },
    {
        name: "Sloth",
        passive: false,
        levels: [
            {
                level: 1,
                description: "Start each round with 125% your current HP",
            },
        ],
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
        passive: false,
        levels: [
            {
                level: 1,
                description:
                    "Deal 150% more DMG, start each round with 25% less HP",
            },
        ],
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
    {
        name: "Pride",
        passive: false,
        levels: [
            {
                level: 1,
                description:
                    "Never go first, deal 250% more damage afterwards.",
            },
        ],
        emoji: "🏅",
        requirements: {
            worldLevel: 15,
            rebirthsRequired: 6,
            coins: 1000,
            items: [
                { item: "Weathered Arrowhead", amount: 10 },
                { item: "Famed Handguard", amount: 5 },
                { item: "Life Essence", amount: 5 },
            ],
        },
    },
    {
        name: "Greed",
        passive: false,
        levels: [
            {
                level: 1,
                description:
                    "Get max drops, all drops, 100% of the time after a hunt.",
            },
        ],
        emoji: "🖤",
        requirements: {
            worldLevel: 25,
            rebirthsRequired: 6,
            coins: 5000,
            items: [
                { item: "Wanderer's Blooming Flower", amount: 3 },
                { item: "Slime Concentrate", amount: 3 },
                { item: "Polarizing Prism", amount: 3 },
                { item: "Ominous Mask", amount: 3 },
                { item: "Weathered Arrowhead", amount: 3 },
                { item: "Forbidden Curse Scroll", amount: 3 },
                { item: "Black Crystal Horn", amount: 3 },
                { item: "Golden Raven Insignia", amount: 3 },
                { item: "Ley Line Sprout", amount: 3 },
                { item: "Mist Grass Wick", amount: 3 },
                { item: "Chaos Core", amount: 3 },
                { item: "Chaos Oculus", amount: 3 },
                { item: "Rich Red Brocade", amount: 3 },
                { item: "Famed Handguard", amount: 3 },
                { item: "Life Essence", amount: 5 },
            ],
        },
    },
]);

export const skillsMap: Record<SkillName, Skill> = skills.reduce(
    (map, skill) => {
        map[skill.name] = skill;
        return map;
    },
    {} as Record<SkillName, Skill>,
);

export function getUserSkillLevelData(
    userStats: UserStats,
    skillName: SkillName,
): SkillLevel | undefined {
    const skill = skillsMap[skillName];
    if (!skill) {
        return undefined;
    }

    const isPassive = skill.passive;
    const isActive = userStats.activeSkills.includes(skillName);

    if (!isPassive && !isActive) {
        return undefined;
    }

    const userSkill = userStats.skills.find(
        (skill) => skill.name === skillName,
    );
    if (!userSkill) {
        return undefined;
    }

    return skill.levels.find((lvl) => lvl.level === userSkill.level);
}
