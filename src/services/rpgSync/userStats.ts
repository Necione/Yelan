import {
    colors,
    discord,
    embedComment,
    formatNumber,
    get,
    is,
    make,
    noop,
    snowflakes,
    status,
} from "@elara-services/utils";
import type { Prisma, UserStats } from "@prisma/client";
import type { Client, TextChannel, User } from "discord.js";
import { calculateFishingLevel } from "../../commands/rpg/handlers/fishHandler";
import { prisma } from "../../prisma";
import { cooldowns, debug } from "../../utils";
import { calculateMasteryLevel } from "../../utils/helpers/masteryHelper";
import type {
    ArtifactSetName,
    ArtifactType,
} from "../../utils/rpgitems/artifacts";
import {
    artifacts,
    artifactSets,
    type ArtifactName,
} from "../../utils/rpgitems/artifacts";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";
import { getProfileByUserId } from "../userProfile";

interface InventoryItem {
    id?: string;
    item: string;
    amount: number;
    metadata?: UserStatsMetaData | null;
}

interface UserStatsMetaData {
    length?: number | null;
}

export async function syncStats(userId: string) {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }

    if (stats.totalAssigned > stats.alchemyProgress) {
        stats.totalAssigned = stats.alchemyProgress;
    }

    const calculatedBaseAttack = 5 + (stats.adventureRank - 1) * 0.5;

    const assignedAttackBonus = (stats.assignedAtk || 0) * 0.25;
    const alchemyBaseAttack = calculatedBaseAttack + assignedAttackBonus;

    const calculatedMaxHP =
        100 + (stats.adventureRank - 1) * 10 + (stats.rebirths || 0) * 5;

    const assignedHpBonus = (stats.assignedHp || 0) * 2;
    const bonusHp = stats.bonusHp || 0;
    const finalMaxHP = calculatedMaxHP + assignedHpBonus + bonusHp;

    const assignedCritValueBonus = (stats.assignedCritValue || 0) * 0.01;
    const assignedDefValueBonus = (stats.assignedDefValue || 0) * 1;
    const calculatedBaseMana = 20;

    const totalStats = {
        critChance: 1,
        defChance: 0,
        attackPower: alchemyBaseAttack,
        critValue: 1 + assignedCritValueBonus,
        defValue: assignedDefValueBonus,
        maxHP: finalMaxHP,
        healEffectiveness: 0,
        maxMana: calculatedBaseMana,
    };

    let needsUpdate = false;
    const updateData: Prisma.UserStatsUpdateInput = {};

    const baseInventoryCap = 1000 + stats.rebirths * 500;
    const totalInventoryCap =
        baseInventoryCap + (stats.scatteredStarsUsed || 0) * 200;

    if (stats.inventoryCap !== totalInventoryCap) {
        updateData.inventoryCap = { set: totalInventoryCap };
        needsUpdate = true;
    }

    const catalystMasteryPoints = stats.masteryCatalyst || 0;
    const catalystMastery = calculateMasteryLevel(catalystMasteryPoints);
    const catalystManaBonuses: { [level: number]: number } = {
        1: 10,
        3: 20,
    };

    for (let level = 1; level <= catalystMastery.numericLevel; level++) {
        if (catalystManaBonuses[level]) {
            totalStats.maxMana += catalystManaBonuses[level];
        }
    }

    if (stats.equippedWeapon && weapons[stats.equippedWeapon as WeaponName]) {
        const weapon = weapons[stats.equippedWeapon as WeaponName];
        totalStats.attackPower += weapon.attackPower || 0;
        totalStats.critChance += weapon.critChance || 0;
        totalStats.critValue += weapon.critValue || 0;
        totalStats.defChance += weapon.defChance || 0;
        totalStats.defValue += weapon.defValue || 0;
        totalStats.maxHP += weapon.additionalHP || 0;
        totalStats.maxMana += weapon.additionalMana || 0;
        totalStats.healEffectiveness || 0;
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
        const field = `equipped${type}` as keyof typeof stats;
        if (stats[field] && artifacts[stats[field] as ArtifactName]) {
            const artifactName = stats[field] as ArtifactName;
            equippedArtifacts[type] = artifactName;

            const artifact = artifacts[artifactName];
            totalStats.attackPower += artifact.attackPower || 0;
            totalStats.critChance += artifact.critChance || 0;
            totalStats.critValue += artifact.critValue || 0;
            totalStats.defChance += artifact.defChance || 0;
            totalStats.defValue += artifact.defValue || 0;
            totalStats.maxHP += artifact.maxHP || 0;
            totalStats.maxMana += artifact.additionalMana || 0;
            totalStats.healEffectiveness || 0;
        }
    }

    const setCounts: { [setName: string]: number } = {};

    for (const artifactName of Object.values(equippedArtifacts)) {
        const artifact = artifacts[artifactName];
        const setName = artifact.artifactSet;
        setCounts[setName] = (setCounts[setName] || 0) + 1;
    }

    for (const [setName, count] of Object.entries(setCounts)) {
        const setBonuses = artifactSets[setName as ArtifactSetName];
        if (setBonuses) {
            if (count >= 2) {
                const bonus2pc = setBonuses["2pc"];
                applySetBonuses(totalStats, bonus2pc);
            }

            if (count >= 4) {
                const bonus4pc = setBonuses["4pc"];
                applySetBonuses(totalStats, bonus4pc);
            }
        }
    }

    if (stats.equippedWeapon && weapons[stats.equippedWeapon as WeaponName]) {
        const weapon = weapons[stats.equippedWeapon as WeaponName];

        if (weapon.type === "Sword") {
            const swordMasteryPoints = stats.masterySword || 0;
            const { numericLevel } = calculateMasteryLevel(swordMasteryPoints);

            if (numericLevel >= 4) {
                totalStats.critChance += 10;
            }

            if (numericLevel >= 5) {
                totalStats.critValue += totalStats.critValue * 0.1;
            }
        }

        if (weapon.type === "Claymore") {
            const claymoreMasteryPoints = stats.masteryClaymore || 0;
            const { numericLevel } = calculateMasteryLevel(
                claymoreMasteryPoints,
            );

            if (numericLevel >= 5) {
                totalStats.defValue += totalStats.defValue * 0.5;
            } else if (numericLevel >= 4) {
                totalStats.defValue += totalStats.defValue * 0.25;
            }
        }
    }

    if (stats.equippedWeapon && stats.equippedWeapon.includes("Amos' Bow")) {
        totalStats.attackPower *= 3;
        totalStats.critChance = 0;
        totalStats.critValue = 0;
    }

    if (stats.maxMana !== totalStats.maxMana) {
        updateData.maxMana = { set: totalStats.maxMana };
        needsUpdate = true;
    }
    if (stats.baseAttack !== alchemyBaseAttack) {
        updateData.baseAttack = { set: alchemyBaseAttack };
        needsUpdate = true;
    }
    if (stats.attackPower !== totalStats.attackPower) {
        updateData.attackPower = { set: totalStats.attackPower };
        needsUpdate = true;
    }
    if (stats.maxHP !== totalStats.maxHP) {
        updateData.maxHP = { set: totalStats.maxHP };
        needsUpdate = true;
    }
    if (stats.critChance !== totalStats.critChance) {
        updateData.critChance = { set: totalStats.critChance };
        needsUpdate = true;
    }
    if (stats.critValue !== totalStats.critValue) {
        updateData.critValue = { set: totalStats.critValue };
        needsUpdate = true;
    }
    if (stats.defChance !== totalStats.defChance) {
        updateData.defChance = { set: totalStats.defChance };
        needsUpdate = true;
    }
    if (stats.defValue !== totalStats.defValue) {
        updateData.defValue = { set: totalStats.defValue };
        needsUpdate = true;
    }
    if (stats.healEffectiveness !== totalStats.healEffectiveness) {
        updateData.healEffectiveness = { set: totalStats.healEffectiveness };
        needsUpdate = true;
    }

    const { correctLevel, validLevel } = calculateFishingLevel(
        stats.fishingExp || 0,
    );
    if (!validLevel || stats.fishingLevel !== correctLevel) {
        debug(
            `Fishing level sync for ${userId}: ${stats.fishingLevel} -> ${correctLevel} (exp: ${stats.fishingExp})`,
        );
        updateData.fishingLevel = { set: correctLevel };
        needsUpdate = true;
    }

    if (stats.equippedWeapon) {
        const equippedWeapon = weapons[stats.equippedWeapon as WeaponName];
        if (equippedWeapon && equippedWeapon.type !== "Catalyst") {
            updateData.castQueue = { set: [] };
            needsUpdate = true;
        }
    }

    if (needsUpdate) {
        return await updateUserStats(userId, updateData);
    }

    return stats;
}

function applySetBonuses(
    totalStats: {
        attackPower: number;
        critChance: number;
        critValue: number;
        defChance: number;
        defValue: number;
        maxHP: number;
        maxMana: number;
        healEffectiveness: number;
    },
    bonuses: { [key: string]: number },
) {
    for (const [key, value] of Object.entries(bonuses)) {
        switch (key) {
            case "attackPowerPercentage":
                totalStats.attackPower += totalStats.attackPower * value;
                break;
            case "critChance":
                totalStats.critChance += value;
                break;
            case "critValuePercentage":
                totalStats.critValue += totalStats.critValue * value;
                break;
            case "maxHPPercentage":
                totalStats.maxHP += totalStats.maxHP * value;
                break;
            case "maxManaPercentage":
                totalStats.maxMana += totalStats.maxMana * value;
                break;
            case "defChance":
                totalStats.defChance += value;
                break;
            case "defValuePercentage":
                totalStats.defValue += totalStats.defValue * value;
                break;
            case "healEffectiveness":
                totalStats.healEffectiveness +=
                    totalStats.healEffectiveness * value;
                break;
            default:
                break;
        }
    }
}

export const getUserStats = async (userId: string) => {
    return await prisma.userStats
        .upsert({
            where: { userId },
            create: {
                userId,
                hp: 100,
                maxHP: 100,
                baseAttack: 5,
                critChance: 0.01,
                critValue: 1,
                inventory: [],
                exp: 0,
                adventureRank: 1,
                healEffectiveness: 0,
                maxMana: 20,
                fishingExp: 0,
            },
            update: {},
        })
        .catch(noop);
};

export const updateUserStats = async (
    userId: string,
    data: Prisma.UserStatsUpdateInput,
) => {
    return await prisma.userStats
        .update({
            where: { userId },
            data,
        })
        .catch(noop);
};

function compareMetadata(
    metadataA: UserStatsMetaData | null | undefined,
    metadataB: UserStatsMetaData | null | undefined,
) {
    if (metadataA == null && metadataB == null) {
        return true;
    }
    if (metadataA == null || metadataB == null) {
        return false;
    }
    return metadataA.length === metadataB.length;
}

export const addItemToInventory = async (
    userId: string,
    items: InventoryItem[],
) => {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }

    let inventory = stats.inventory as InventoryItem[];

    if (!is.array(inventory)) {
        inventory = [];
    }

    let totalItems = inventory.reduce((sum, item) => sum + item.amount, 0);
    const itemsToAdd = items.reduce((sum, item) => sum + item.amount, 0);

    if (totalItems + itemsToAdd > stats.inventoryCap) {
        return false;
    }

    if (is.array(items)) {
        for (const i of items) {
            const existingItem = inventory.find(
                (c) =>
                    c.item === i.item &&
                    compareMetadata(c.metadata, i.metadata),
            );
            if (existingItem) {
                if (!existingItem.id) {
                    existingItem.id = snowflakes.generate();
                }
                existingItem.amount = Math.floor(
                    existingItem.amount + i.amount,
                );
                totalItems += i.amount;
            } else {
                if (!i.id) {
                    i.id = snowflakes.generate();
                }
                inventory.push(i);
                totalItems += i.amount;
            }
        }
    }

    return await updateUserStats(userId, {
        inventory: {
            set: inventory,
        },
    });
};

export const removeItemFromInventory = async (
    userId: string,
    itemName: string,
    amount: number,
    metadata?: UserStatsMetaData | null,
) => {
    const stats = await getUserStats(userId);
    if (!stats) {
        return null;
    }

    let inventory = stats.inventory as InventoryItem[];

    if (!is.array(inventory)) {
        inventory = [];
    }

    const itemIndex = inventory.findIndex(
        (c) => c.item === itemName && compareMetadata(c.metadata, metadata),
    );

    if (itemIndex === -1) {
        return null;
    }

    const item = inventory[itemIndex];
    if (!item.id) {
        item.id = snowflakes.generate();
    }
    item.amount = Math.floor(item.amount - amount);
    if (item.amount <= 0) {
        inventory.splice(itemIndex, 1);
    } else {
        inventory[itemIndex] = item;
    }

    return await updateUserStats(userId, {
        inventory: {
            set: inventory,
        },
    });
};

export async function syncInventoryItems(client: Client<true>) {
    const changePerms = async (lock = true) => {
        const channel = await discord.channel<TextChannel>(
            client,
            "1280336582263443591",
        );
        if (!channel) {
            return status.error(`Unable to find the genshin-rpg channel.`);
        }
        await channel.permissionOverwrites
            .edit(channel.guildId, {
                SendMessages: lock ? false : true,
                SendMessagesInThreads: lock ? false : true,
            })
            .catch(noop);
        await channel
            .send(
                embedComment(
                    lock
                        ? `# Syncing inventory items, channel will be locked for a few minutes.`
                        : "# Syncing finished, channel will be unlocked now.",
                    lock ? colors.red : colors.green,
                ),
            )
            .catch(noop);
        return status.success(`Channel permissions changed.`);
    };
    await changePerms(true);
    const users = await prisma.userStats.findMany().catch(() => []);
    if (!is.array(users)) {
        return status.error(`No userStats found?...`);
    }
    for await (const db of users) {
        await syncInventoryItemsForUser(db.userId, db, false);
    }
    await changePerms(false);
    return status.success(
        `Updated ${formatNumber(users.length)} users inventory`,
    );
}

export async function syncInventoryItemsForUser(
    userId: string,
    db?: UserStats,
    cooldown = true,
) {
    if (!db) {
        // @ts-ignore
        db = await getUserStats(userId);
    }
    if (!db) {
        return status.error(`Unable to fetch your user stats.`);
    }
    if (cooldown === true) {
        const p = await getProfileByUserId(userId);
        if (!p) {
            return status.error(`Unable to fetch your user profile.`);
        }
        if (p.locked) {
            return status.error(`Your user profile is locked..`);
        }
        const re = cooldowns.get(p, "syncingInv");
        if (!re.status) {
            return status.error(re.message);
        }
        await cooldowns.set(p, "syncingInv", get.mins(15));
    }
    if (!is.array(db.inventory)) {
        db.inventory = [];
    }
    const updated = [];
    for (const inv of db.inventory) {
        if (inv.metadata) {
            updated.push(inv);
            continue;
        }
        const f = updated.find((c) => c.item === inv.item);
        if (f) {
            f.amount = Math.floor(f.amount + inv.amount);
        } else {
            updated.push(inv);
        }
    }
    db.inventory = updated.map((c) => {
        if (!is.string(c.id)) {
            c.id = snowflakes.generate();
        }
        return c;
    });
    await updateUserStats(db.userId, {
        inventory: { set: db.inventory },
    });
    return status.success(`Inventory for <@${db.userId}> is now synced!`);
}

export const loadouts = {
    get: async (user: string | User, name: string) => {
        return await prisma.loadout
            .findUnique({
                where: {
                    user_loadout_unique: {
                        userId: is.string(user) ? user : user.id,
                        name,
                    },
                },
            })
            .catch(noop);
    },
    update: async (id: string, data: Prisma.LoadoutUpdateInput) => {
        return await prisma.loadout
            .update({
                where: { id },
                data,
            })
            .catch(noop);
    },
    create: async (data: Prisma.LoadoutCreateInput) => {
        return await prisma.loadout.create({ data }).catch(noop);
    },
    list: async (user: string | User, name: string) => {
        const userId = is.string(user) ? user : user.id;

        const allLoadouts = await prisma.loadout
            .findMany({
                where: {
                    name: {
                        contains: name,
                        mode: "insensitive",
                    },
                },
            })
            .catch(() => []);

        if (!is.array(allLoadouts)) {
            return [];
        }

        const userLoadouts = allLoadouts.filter((c) => c.userId === userId);
        const publicLoadouts = allLoadouts.filter(
            (c) => c.userId !== userId && c.isPrivate === false,
        );

        return [...userLoadouts, ...publicLoadouts].slice(0, 25);
    },
    getById: async (id: string) => {
        return await prisma.loadout
            .findFirst({
                where: { id },
            })
            .catch(noop);
    },
};
