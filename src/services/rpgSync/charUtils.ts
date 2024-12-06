import { make, noop } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import type { ArtifactType } from "../../utils/rpgitems/artifacts";
import {
    type ArtifactName,
    artifacts,
    type ArtifactSetName,
    getArtifactSetBonuses,
} from "../../utils/rpgitems/artifacts";
import { type WeaponName, weapons } from "../../utils/rpgitems/weapons";

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

export async function syncCharacter(characterId: string) {
    const character = await getUserCharacters(characterId);
    if (!character) {
        return null;
    }

    const calculatedBaseAttack = 5 + (character.level - 1) * 0.5;
    const assignedAttackBonus = (character.assignedAtk || 0) * 0.25;
    const baseAttack = calculatedBaseAttack + assignedAttackBonus;

    const calculatedMaxHP =
        100 + (character.level - 1) * 10 + (character.rebirths || 0) * 5;

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
        const field = `equipped${type}` as keyof typeof character;
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

async function getUserCharacters(characterId: string) {
    return await prisma.userCharacter
        .findUnique({
            where: { id: characterId },
        })
        .catch(noop);
}

async function updateUserCharacter(
    characterId: string,
    data: Prisma.UserCharacterUpdateInput,
) {
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

export function calculateSetBonuses(equippedArtifacts: {
    [slot in ArtifactType]?: ArtifactName;
}): {
    attackPowerPercentage: number;
    critChance: number;
    critValuePercentage: number;
    maxHPPercentage: number;
    defChance: number;
    defValuePercentage: number;
    healEffectiveness: number;
} {
    const bonuses = {
        attackPowerPercentage: 0,
        critChance: 0,
        critValuePercentage: 0,
        maxHPPercentage: 0,
        defChance: 0,
        defValuePercentage: 0,
        healEffectiveness: 0,
    };

    const setCounts: { [setName: string]: number } = {};

    for (const artifactName of Object.values(equippedArtifacts)) {
        const artifact = artifacts[artifactName];
        if (artifact) {
            const setName = artifact.artifactSet;
            setCounts[setName] = (setCounts[setName] || 0) + 1;
        }
    }

    for (const [setName, count] of Object.entries(setCounts)) {
        const setBonuses = getArtifactSetBonuses(setName as ArtifactSetName);
        if (setBonuses) {
            if (count >= 2) {
                const bonus2pc = setBonuses["2pc"];
                for (const [key, value] of Object.entries(bonus2pc)) {
                    bonuses[key as keyof typeof bonuses] += value as number;
                }
            }
            if (count >= 4) {
                const bonus4pc = setBonuses["4pc"];
                for (const [key, value] of Object.entries(bonus4pc)) {
                    bonuses[key as keyof typeof bonuses] += value as number;
                }
            }
        }
    }

    return bonuses;
}
