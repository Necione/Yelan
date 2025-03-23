export type SwordStyleRank = "Novice" | "Apprentice" | "Adept";
export type SwordStyleName =
    | "Kamisato Art"
    | "Guhua Style"
    | "Favonius Bladework";

interface SwordStyleTrait {
    name: string;
    description: string;
    rank: SwordStyleRank;
}

export interface SwordStyleInfo {
    description: string;
    traits: SwordStyleTrait[];
    gainCondition: string;
}

export const swordStyles: Record<SwordStyleName, SwordStyleInfo> = {
    "Guhua Style": {
        description:
            "An ancient martial art that emphasizes harmony between the practitioner and the elements.",
        gainCondition:
            "Must have 3 or fewer active skills to gain proficiency.",
        traits: [
            {
                name: "Thousand Swords",
                description:
                    "For every X swords in your inventory, deal X bonus damage per turn.",
                rank: "Novice",
            },
            {
                name: "Ambient Healing",
                description:
                    "For every 1000 DMG dealt with the sword, heal 100 HP.",
                rank: "Apprentice",
            },
            {
                name: "Blade Resonance",
                description: "Deal damage with 3 different swords at once.",
                rank: "Adept",
            },
        ],
    },
    "Kamisato Art": {
        description:
            "An elegant sword style passed down through generations of the Kamisato Clan, known for its swift and precise strikes.",
        gainCondition: "Must finish battles in 5 turns or less.",
        traits: [
            {
                name: "Frozen Domain",
                description:
                    "Deal your weapon's base DMG with every attack as bonus damage.",
                rank: "Novice",
            },
            {
                name: "Cold Snap",
                description:
                    "Have a 100% Crit Rate if you are above 80% Max HP.",
                rank: "Apprentice",
            },
            {
                name: "Soumetsu",
                description:
                    "Monsters deal 20% less damage, and are frozen for the first turn.",
                rank: "Adept",
            },
        ],
    },
    "Favonius Bladework": {
        description:
            "The standard sword style of the Knights of Favonius, emphasizing discipline and honor in combat.",
        gainCondition: "Must finish battles with 50% or more Max HP remaining.",
        traits: [
            {
                name: "Knight's Armor",
                description:
                    "At the end of every hunt, gain shield equal to 25% of your Max HP.",
                rank: "Novice",
            },
            {
                name: "Knight's Resolve",
                description: "Die only if you are below -50% of your Max HP.",
                rank: "Apprentice",
            },
            {
                name: "One Dark Night",
                description:
                    "Deal 20% more damage for every ascended weapon in your inventory.",
                rank: "Adept",
            },
        ],
    },
};

export function calculateSwordStyleRank(points: number): SwordStyleRank {
    if (points >= 150) {
        return "Adept";
    }
    if (points >= 50) {
        return "Apprentice";
    }
    return "Novice";
}

export function getStylePoints(
    stats: {
        styleKamisato: number;
        styleGuhua: number;
        styleFavonius: number;
    },
    style: SwordStyleName,
): number {
    switch (style) {
        case "Kamisato Art":
            return stats.styleKamisato;
        case "Guhua Style":
            return stats.styleGuhua;
        case "Favonius Bladework":
            return stats.styleFavonius;
        default:
            return 0;
    }
}

export function isValidSwordStyle(style: string): style is SwordStyleName {
    return ["Kamisato Art", "Guhua Style", "Favonius Bladework"].includes(
        style,
    );
}

export function getUnlockedTraits(
    style: SwordStyleName,
    points: number,
): SwordStyleTrait[] {
    const traits: SwordStyleTrait[] = [];
    const styleInfo = swordStyles[style];

    if (points >= 0) {
        traits.push(styleInfo.traits[0]);
    }
    if (points >= 50) {
        traits.push(styleInfo.traits[1]);
    }
    if (points >= 150) {
        traits.push(styleInfo.traits[2]);
    }

    return traits;
}

export interface StyleGainCheck {
    hp: number;
    maxHp: number;
    turnCount: number;
    activeSkillCount: number;
    equippedWeaponType?: string;
}

export function checkStyleGainCondition(
    style: SwordStyleName,
    stats: StyleGainCheck,
): boolean {
    if (stats.equippedWeaponType !== "Sword") {
        return false;
    }

    switch (style) {
        case "Kamisato Art":
            return stats.turnCount <= 5;
        case "Guhua Style":
            return stats.activeSkillCount <= 3;
        case "Favonius Bladework":
            return stats.hp > stats.maxHp / 2;
        default:
            return false;
    }
}
