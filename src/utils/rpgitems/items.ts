export const drops = {
    "Damaged Mask": { sellPrice: 5 },
    "Stained Mask": { sellPrice: 10 },
    "Ominous Mask": { sellPrice: 20 },
    "Slime Condensate": { sellPrice: 3 },
    "Slime Secretions": { sellPrice: 8 },
    "Slime Concentrate": { sellPrice: 15 },
    "Firm Arrowhead": { sellPrice: 8 },
    "Sharp Arrowhead": { sellPrice: 16 },
    "Divining Scroll": { sellPrice: 8 },
    "Sealed Scroll": { sellPrice: 16 },
};

export type DropName = keyof typeof drops;
