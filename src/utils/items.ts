export const items = {
    "Damaged Mask": { sellPrice: 5 },
    "Stained Mask": { sellPrice: 10 },
    "Ominous Mask": { sellPrice: 20 },
    "Slime Condensate": { sellPrice: 3 },
    "Slime Secretions": { sellPrice: 8 },
    "Firm Arrowhead": { sellPrice: 8 },
    "Sharp Arrowhead": { sellPrice: 16 },
};

export type ItemName = keyof typeof items;
