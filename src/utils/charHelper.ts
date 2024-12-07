import { getRandom, is } from "@elara-services/utils";
import { cdn } from "@liyueharbor/econ";
import type { UserCharacter } from "@prisma/client";

export interface CharsData {
    baseName: string;
    baseATK: number;
    baseHP: number;
    thumbnails: string[];
}
export const chars: { [key: string]: CharsData } = {
    Amber: {
        baseName: "Amber",
        baseATK: 5,
        baseHP: 100,
        thumbnails: [
            cdn("/rpg/chars/amber1.png"),
            cdn("/rpg/chars/amber2.png"),
            cdn("/rpg/chars/amber3.png"),
            cdn("/rpg/chars/amber4.png"),
            cdn("/rpg/chars/amber5.png"),
        ],
    },
    Kaeya: {
        baseName: "Kaeya",
        baseATK: 10,
        baseHP: 100,
        thumbnails: [
            cdn("/rpg/chars/kaeya1.png"),
            cdn("/rpg/chars/kaeya1.png"),
            cdn("/rpg/chars/kaeya3.png"),
            cdn("/rpg/chars/kaeya4.png"),
            cdn("/rpg/chars/kaeya5.png"),
        ],
    },
};

export type CharsName = keyof typeof chars;
export const charsList: (CharsData & { name: string })[] = Object.entries(
    chars,
).map(([name, data]) => ({ name, ...data }));

export function getRandomThumbnail(charName: keyof typeof chars): string {
    const characterData = chars[charName];
    if (is.array(characterData.thumbnails)) {
        return getRandom(characterData.thumbnails);
    }
    return cdn(`/rpg/chars/weird.png`);
}

export function getCharacterDisplayName(character: UserCharacter): string {
    return character.nickname
        ? character.nickname
        : chars[character.name as keyof typeof chars].baseName;
}
