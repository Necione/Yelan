export const drops = {
    "Damaged Mask": {
        sellPrice: 5,
        minAmount: 1,
        maxAmount: 2,
        minWorldLevel: 1,
        chestChance: 25,
    },
    "Stained Mask": {
        sellPrice: 10,
        minAmount: 1,
        maxAmount: 2,
        minWorldLevel: 2,
        chestChance: 15,
    },
    "Ominous Mask": {
        sellPrice: 20,
        minAmount: 1,
        maxAmount: 1,
        minWorldLevel: 3,
        chestChance: 5,
    },
    "Slime Condensate": {
        sellPrice: 3,
        minAmount: 1,
        maxAmount: 3,
        minWorldLevel: 1,
        chestChance: 25,
    },
    "Slime Secretions": {
        sellPrice: 8,
        minAmount: 1,
        maxAmount: 2,
        minWorldLevel: 2,
        chestChance: 15,
    },
    "Slime Concentrate": {
        sellPrice: 15,
        minAmount: 1,
        maxAmount: 1,
        minWorldLevel: 3,
        chestChance: 5,
    },
    "Firm Arrowhead": {
        sellPrice: 8,
        minAmount: 1,
        maxAmount: 3,
        minWorldLevel: 1,
        chestChance: 25,
    },
    "Sharp Arrowhead": {
        sellPrice: 16,
        minAmount: 1,
        maxAmount: 2,
        minWorldLevel: 2,
        chestChance: 15,
    },
    "Divining Scroll": {
        sellPrice: 8,
        minAmount: 1,
        maxAmount: 3,
        minWorldLevel: 1,
        chestChance: 5,
    },
    "Sealed Scroll": {
        sellPrice: 16,
        minAmount: 1,
        maxAmount: 2,
        minWorldLevel: 3,
        chestChance: 25,
    },
};

export type DropName = keyof typeof drops;
