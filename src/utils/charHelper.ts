import type { UserCharacter } from "@prisma/client";

export interface CharsData {
    baseName: string;
    baseATK: number;
    baseHP: number;
    thumbnails?: string[];
}
export const chars: { [key: string]: CharsData } = {
    Amber: {
        baseName: "Amber",
        baseATK: 5,
        baseHP: 100,
        thumbnails: [
            "https://lh.elara.workers.dev/rpg/chars/amber1.png",
            "https://lh.elara.workers.dev/rpg/chars/amber2.png",
            "https://lh.elara.workers.dev/rpg/chars/amber3.png",
            "https://lh.elara.workers.dev/rpg/chars/amber4.png",
            "https://lh.elara.workers.dev/rpg/chars/amber5.png",
        ],
    },
    Kaeya: {
        baseName: "Kaeya",
        baseATK: 10,
        baseHP: 100,
    },
};
export type CharsName = keyof typeof chars;
export const charsList: (CharsData & { name: string })[] = Object.entries(
    chars,
).map(([name, data]) => ({ name, ...data }));

export function getRandomThumbnail(charName: keyof typeof chars): string {
    const characterData = chars[charName];
    if (characterData.thumbnails && characterData.thumbnails.length > 0) {
        const randomIndex = Math.floor(
            Math.random() * characterData.thumbnails.length,
        );
        return characterData.thumbnails[randomIndex];
    }
    return "https://lh.elara.workers.dev/rpg/chars/weird.png";
}

export function getCharacterDisplayName(character: UserCharacter): string {
    return character.nickname
        ? character.nickname
        : chars[character.name as keyof typeof chars].baseName;
}
