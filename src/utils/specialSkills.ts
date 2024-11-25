export type SpecialSkillName =
    | "Parry"
    | "Backstep"
    | "Perfect Parry"
    | "Bolster"
    | "Undying"
    | "Fear"
    | "Soulstealer"
    | "Thrust"
    | "Sniper"
    | "Quickdraw"
    | "Focus"
    | "Peer";

export interface SpecialSkill {
    skillName: SpecialSkillName;
    emoji: string;
    description: string;
}

export const specialSkills: SpecialSkill[] = [
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
        skillName: "Undying",
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
        description: "Increase Crit Rate exponentially duing battle.",
    },
    {
        skillName: "Quickdraw",
        emoji: "🏹",
        description:
            "Attack twice on the second turn, dealing 25% of your ATK.",
    },
    {
        skillName: "Thrust",
        emoji: "👊🏻",
        description: "Every attack deals 10% DMG to the next monster too.",
    },
    {
        skillName: "Peer",
        emoji: "🔮",
        description: "Know what monsters will be in your next hunt.",
    },
];
