import { type WeaponType } from "./rpgitems/weapons";

export interface MasteryBenefit {
    description?: string;
    specialSkill?: string;
}

export const masteryBenefits: Record<
    WeaponType,
    Record<number, MasteryBenefit>
> = {
    Sword: {
        1: {
            description: "Deal 110% damage when wielding the Sword.",
        },
        2: {
            specialSkill: "Parry",
        },
        3: {
            specialSkill: "Backstep",
        },
        4: {
            description: "Increase your Crit Rate by 10% with the Sword.",
        },
        5: {
            description: "Increase your Crit Value by 10% with the Sword.",
        },
        6: {
            description: "Deal 150% damage when wielding the Sword.",
        },
        7: {
            specialSkill: "Perfect Parry",
        },
        8: {
            specialSkill: "Bolster",
        },
        9: {
            description: "Deal 200% damage when wielding the Sword.",
        },
        10: {
            description: "Deal 300% damage when wielding the Sword.",
        },
    },
    Claymore: {
        1: {
            description: "Deal 110% damage when wielding the Claymore.",
        },
        2: {
            specialSkill: "Fortress",
        },
        3: {
            description: "Deal 150% damage when wielding the Claymore.",
        },
        4: {
            description: "Increase DEF Value by 25%.",
        },
        5: {
            description: "Increase DEF Value by 50%.",
        },
        6: {
            description: "Deal 200% damage when wielding the Claymore.",
        },
        7: {
            description: "Double your Max HP when wielding the Claymore.",
        },
        8: {
            specialSkill: "Fear",
        },
        9: {
            description: "Unlock the Shield stat.",
        },
        10: {
            description: "Deal 350% damage when wielding the Claymore.",
        },
    },
    Bow: {
        1: {
            description: "Deal 110% damage when wielding the Bow.",
        },
        2: {
            specialSkill: "Quickdraw",
        },
        3: {
            description: "Deal 150% damage when wielding the Bow.",
        },
        4: {
            description: "Increase Crit Value by 5% when wielding the Bow.",
        },
        5: {
            description: "Deal 150% damage when wielding the Bow.",
        },
        6: {
            specialSkill: "Focus",
        },
        7: {
            description: "Deal 200% damage when wielding the Bow.",
        },
        8: {
            description: "Increase Crit Value by 50% when wielding the Bow.",
        },
        9: {
            specialSkill: "Sniper",
        },
        10: {
            description: "Always Crit.",
        },
    },
    Polearm: {
        1: {
            description: "Increase Max HP by 10% when wielding the Polearm.",
        },
        2: {
            description: "Increase effectiveness of all healing skills.",
        },
        3: {
            specialSkill: "Thrust",
        },
        4: {
            description: "Deal 200% damage when wielding the Polearm.",
        },
        5: {
            description:
                "Never encounter mutated monsters when wielding the Polearm.",
        },
        10: {
            description: "Deal 500% damage when wielding the Polearm.",
        },
    },
    Catalyst: {
        1: {
            description: "Increase your Maximum Mana by 10.",
        },
        2: {
            description: "Unlock the spell `Poison`",
        },
        3: {
            description: "Increase your Maximum Mana by 30.",
        },
        4: {
            description: "Regenerate 50% more mana after hunts.",
        },
        5: {
            specialSkill: "Peer",
        },
        6: {
            description: "Unlock the spell `Distract`",
        },
        7: {
            description: "Unlock the spell `Meteor`",
        },
        8: {
            description: "Unlock the spell `Full Heal`",
        },
        9: {
            description: "Deal 200% damage when wielding the Catalyst.",
        },
        10: {
            specialSkill: "Soulstealer",
        },
    },
    Rod: {
        5: {
            description: "Deal 500% damage with the Rod.",
        },
        10: {
            description: "Deal 1000% damage with the Rod.",
        },
    },
};
