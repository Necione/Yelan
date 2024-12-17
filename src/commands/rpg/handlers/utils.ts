import { is } from "@elara-services/utils";

export const prefixes = [
    "Old",
    "Sharp",
    "Godly",
    "Perfect",
    "Worthless",
    "Spicy",
    "Hearty",
    "Ancient",
    "Clean",
    "Wise",
    "Jaded",
];

export function getPrefix(weaponName: string, list?: string[]): string {
    if (is.array(list)) {
        return list.find((c) => weaponName.startsWith(`${c} `)) || "";
    }
    return prefixes.find((c) => weaponName.startsWith(`${c} `)) || "";
}

export function getBaseName(weaponName: string, list?: string[]): string {
    const prefix = getPrefix(weaponName, list);
    if (prefix) {
        return weaponName.replace(`${prefix} `, "");
    }
    return weaponName;
}
