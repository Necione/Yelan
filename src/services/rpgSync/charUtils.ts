import { make, noop } from "@elara-services/utils";
import type { Prisma, UserCharacter } from "@prisma/client";
import { prisma } from "../../prisma";
import { calculateSetBonuses } from "../../utils/artifactHelper";
import { chars, type CharsName } from "../../utils/charHelper";
import type {
    ArtifactName,
    ArtifactType,
} from "../../utils/rpgitems/artifacts";
import { artifacts } from "../../utils/rpgitems/artifacts";
import type { WeaponName } from "../../utils/rpgitems/weapons";
import { weapons } from "../../utils/rpgitems/weapons";

interface CharacterStats {
    critChance: number;
    defChance: number;
    attackPower: number;
    critValue: number;
    defValue: number;
    maxHP: number;
    healEffectiveness: number;
    maxMana: number;
}

export async function getCharacterById(
    characterId: string,
): Promise<UserCharacter | null> {
    return await prisma.userCharacter
        .findUnique({
            where: { id: characterId },
        })
        .catch(noop);
}

export async function syncCharacter(
    characterId: string,
): Promise<UserCharacter | null> {
    const character = await getCharacterById(characterId);
    if (!character) {
        console.error(`Character with ID "${characterId}" not found.`);
        return null;
    }

    const baseData = chars[character.name as CharsName];
    if (!baseData) {
        console.error(`Base data for character "${character.name}" not found.`);
        return character;
    }

    const PER_LEVEL_ATK_INCREASE = 0.5;
    const PER_LEVEL_HP_INCREASE = 10;

    const calculatedBaseAttack =
        baseData.baseATK + (character.level - 1) * PER_LEVEL_ATK_INCREASE;
    const assignedAttackBonus = (character.assignedAtk || 0) * 0.25;
    const baseAttack = calculatedBaseAttack + assignedAttackBonus;

    const calculatedMaxHP =
        baseData.baseHP + (character.level - 1) * PER_LEVEL_HP_INCREASE;
    const assignedHpBonus = (character.assignedHp || 0) * 2;
    const finalMaxHP = calculatedMaxHP + assignedHpBonus;

    const assignedCritValueBonus = (character.assignedCritValue || 0) * 0.01;
    const assignedDefValueBonus = (character.assignedDefValue || 0) * 1;
    const calculatedBaseMana = 20;

    const totalStats: CharacterStats = {
        critChance: 1,
        defChance: 0,
        attackPower: baseAttack,
        critValue: 1 + assignedCritValueBonus,
        defValue: assignedDefValueBonus,
        maxHP: finalMaxHP,
        healEffectiveness: 0,
        maxMana: calculatedBaseMana,
    };

    if (
        character.equippedWeapon &&
        weapons[character.equippedWeapon as WeaponName]
    ) {
        const weapon = weapons[character.equippedWeapon as WeaponName];
        totalStats.attackPower += weapon.attackPower || 0;
        totalStats.critChance += weapon.critChance || 0;
        totalStats.critValue += weapon.critValue || 0;
        totalStats.defChance += weapon.defChance || 0;
        totalStats.defValue += weapon.defValue || 0;
        totalStats.maxHP += weapon.additionalHP || 0;
    }

    const artifactTypes = make.array<ArtifactType>([
        "Flower",
        "Plume",
        "Sands",
        "Goblet",
        "Circlet",
    ]);

    const equippedArtifacts: { [slot in ArtifactType]?: ArtifactName } = {};

    for (const type of artifactTypes) {
        const field = `equipped${type}` as keyof UserCharacter;
        if (character[field] && artifacts[character[field] as ArtifactName]) {
            const artifactName = character[field] as ArtifactName;
            equippedArtifacts[type] = artifactName;

            const artifact = artifacts[artifactName];
            totalStats.attackPower += artifact.attackPower || 0;
            totalStats.critChance += artifact.critChance || 0;
            totalStats.critValue += artifact.critValue || 0;
            totalStats.defChance += artifact.defChance || 0;
            totalStats.defValue += artifact.defValue || 0;
            totalStats.maxHP += artifact.maxHP || 0;
        }
    }

    const setBonuses = calculateSetBonuses(equippedArtifacts);
    applySetBonuses(totalStats, setBonuses);

    totalStats.attackPower = Math.max(0, totalStats.attackPower);
    totalStats.critChance = Math.max(0, totalStats.critChance);
    totalStats.critValue = Math.max(0, totalStats.critValue);
    totalStats.defChance = Math.max(0, totalStats.defChance);
    totalStats.defValue = Math.max(0, totalStats.defValue);
    totalStats.maxHP = Math.floor(totalStats.maxHP);
    totalStats.healEffectiveness = Math.max(0, totalStats.healEffectiveness);
    totalStats.maxMana = Math.floor(totalStats.maxMana);

    let needsUpdate = false;
    const updateData: Prisma.UserCharacterUpdateInput = {};

    if (character.baseAttack !== baseAttack) {
        updateData.baseAttack = { set: baseAttack };
        needsUpdate = true;
    }
    if (character.attackPower !== totalStats.attackPower) {
        updateData.attackPower = { set: totalStats.attackPower };
        needsUpdate = true;
    }
    if (character.maxHP !== totalStats.maxHP) {
        updateData.maxHP = { set: totalStats.maxHP };
        needsUpdate = true;
    }
    if (character.critChance !== totalStats.critChance) {
        updateData.critChance = { set: totalStats.critChance };
        needsUpdate = true;
    }
    if (character.critValue !== totalStats.critValue) {
        updateData.critValue = { set: totalStats.critValue };
        needsUpdate = true;
    }
    if (character.defChance !== totalStats.defChance) {
        updateData.defChance = { set: totalStats.defChance };
        needsUpdate = true;
    }
    if (character.defValue !== totalStats.defValue) {
        updateData.defValue = { set: totalStats.defValue };
        needsUpdate = true;
    }

    if (needsUpdate) {
        return await updateUserCharacter(characterId, updateData);
    }

    return character;
}

export async function getUserCharacters(
    userId: string,
): Promise<UserCharacter[]> {
    return await prisma.userCharacter
        .findMany({
            where: { userId },
        })
        .catch(() => []);
}

export async function updateUserCharacter(
    characterId: string,
    data: Prisma.UserCharacterUpdateInput,
): Promise<UserCharacter | null> {
    return await prisma.userCharacter
        .update({
            where: { id: characterId },
            data,
        })
        .catch(noop);
}

function applySetBonuses(
    totalStats: CharacterStats,
    bonuses: {
        attackPowerPercentage: number;
        critChance: number;
        critValuePercentage: number;
        maxHPPercentage: number;
        defChance: number;
        defValuePercentage: number;
        healEffectiveness: number;
    },
) {
    if (bonuses.attackPowerPercentage) {
        totalStats.attackPower +=
            totalStats.attackPower * bonuses.attackPowerPercentage;
    }
    if (bonuses.critChance) {
        totalStats.critChance += bonuses.critChance;
    }
    if (bonuses.critValuePercentage) {
        totalStats.critValue +=
            totalStats.critValue * bonuses.critValuePercentage;
    }
    if (bonuses.maxHPPercentage) {
        totalStats.maxHP += totalStats.maxHP * bonuses.maxHPPercentage;
    }
    if (bonuses.defChance) {
        totalStats.defChance += bonuses.defChance;
    }
    if (bonuses.defValuePercentage) {
        totalStats.defValue += totalStats.defValue * bonuses.defValuePercentage;
    }
    if (bonuses.healEffectiveness) {
        totalStats.healEffectiveness += bonuses.healEffectiveness;
    }
}

export async function createDefaultCharacterForUser(
    userId: string,
    characterName = "Amber",
): Promise<UserCharacter | null> {
    const characterData = chars[characterName];
    if (!characterData) {
        console.error(`Character data for "${characterName}" not found.`);
        return null;
    }
    return await prisma.userCharacter
        .create({
            data: {
                userId,
                name: characterName,
                nickname: null,
                level: 1,
                equippedWeapon: null,
                equippedFlower: null,
                equippedPlume: null,
                equippedSands: null,
                equippedGoblet: null,
                equippedCirclet: null,
                attackPower: characterData.baseATK,
                baseAttack: characterData.baseATK,
                maxHP: characterData.baseHP,
                hp: characterData.baseHP,
                critChance: 1,
                defChance: 0,
                critValue: 1,
                defValue: 0,
                healEffectiveness: 0,
                maxMana: 20,
                expedition: false,
            },
        })
        .catch(noop);
}
