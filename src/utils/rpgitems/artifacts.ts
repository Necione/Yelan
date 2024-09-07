export const artifacts = {
    "Adventurer's Flower": {
        type: "Flower",
        sellPrice: 5,
        attackPower: 0,
        critChance: 0,
        critValue: 0,
        maxHP: 10,
    },
    "Adventurer's Tail Feather": {
        type: "Plume",
        sellPrice: 5,
        attackPower: 1.5,
        critChance: 0,
        critValue: 0,
        maxHP: 0,
    },
    "Adventurer's Pocket Watch": {
        type: "Sands",
        sellPrice: 5,
        attackPower: 1,
        critChance: 5,
        critValue: 0.25,
        maxHP: 5,
    },
    "Adventurer's Golden Goblet": {
        type: "Goblet",
        sellPrice: 5,
        attackPower: 0,
        critChance: 0,
        critValue: 0.5,
        maxHP: 0,
    },
    "Adventurer's Bandana": {
        type: "Circlet",
        sellPrice: 5,
        attackPower: 0,
        critChance: 15,
        critValue: 0,
        maxHP: 0,
    },
};

export type ArtifactName = keyof typeof artifacts;
export type ArtifactType = "Flower" | "Plume" | "Sands" | "Goblet" | "Circlet";

export function getArtifactType(artifact: ArtifactName): ArtifactType {
    return artifacts[artifact].type as ArtifactType;
}
