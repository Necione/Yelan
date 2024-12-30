import { make } from "@elara-services/utils";

export type SpecialSkillName =
    | "Parry"
    | "Backstep"
    | "Perfect Parry"
    | "Bolster"
    | "Fortress"
    | "Fear"
    | "Soulstealer"
    | "Sting"
    | "Sniper"
    | "Sharpshooter"
    | "Focus"
    | "Peer";

export interface SpecialSkill {
    skillName: SpecialSkillName;
    emoji: string;
    description: string;
}

export const specialSkills = make.array<SpecialSkill>([
    {
        skillName: "Parry",
        emoji: "⚔️",
        description: "Have a 20% chance of parrying 50% of incoming damage",
    },
    {
        skillName: "Backstep",
        emoji: "💨",
        description: "Have a 25% chance of dodging attacks completely",
    },
    {
        skillName: "Perfect Parry",
        emoji: "⚔️",
        description: "Have a 20% chance of parrying 100% of incoming damage",
    },
    {
        skillName: "Bolster",
        emoji: "🥊",
        description: "Deal 300% damage on your first hit in a battle",
    },
    {
        skillName: "Fortress",
        emoji: "💀",
        description:
            "The next attack that kills you leaves you at 1 HP instead",
    },
    {
        skillName: "Fear",
        emoji: "👁️",
        description: "Enemies have a 50% chance of missing their attack",
    },
    {
        skillName: "Soulstealer",
        emoji: "🖤",
        description:
            "Steal the soul of a killed monster. That monster will battle in your place next hunt until it dies.",
    },
    {
        skillName: "Sniper",
        emoji: "🎯",
        description: "Have a 10% of one shotting any monster.",
    },
    {
        skillName: "Focus",
        emoji: "🍀",
        description: "For every X% HP lost gain X% Crit Rate.",
    },
    {
        skillName: "Sharpshooter",
        emoji: "🏹",
        description:
            "Deal 110% more damage per turn.",
    },
    {
        skillName: "Sting",
        emoji: "🦂",
        description:
            "Have a 20% to stun the monster, and simultaneously heal 20% of your Max HP",
    },
    {
        skillName: "Peer",
        emoji: "🔮",
        description: "Know what monsters will be in your next hunt.",
    },
]);
