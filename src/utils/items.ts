export const items = {
    "Damaged Mask": { sellPrice: 5 },
    "Stained Mask": { sellPrice: 10 },
    "Slime Condensate": { sellPrice: 3 },
    "Slime Secretions": { sellPrice: 8 },
};

export type ItemName = keyof typeof items;
