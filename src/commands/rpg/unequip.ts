import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import {
    artifacts,
    getArtifactType,
    type ArtifactName,
} from "../../utils/rpgitems/artifacts";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const unequip = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("unequip")
        .setDescription(
            "[RPG] Unequip your currently equipped weapon or artifact.",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The weapon or artifact to unequip")
                .setRequired(true)
                .setAutocomplete(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return i
                .respond([{ name: "No stats found.", value: "n/a" }])
                .catch(noop);
        }

        const equippedItems: { name: string; value: string }[] = [];

        equippedItems.push({
            name: "All",
            value: "All",
        });

        if (stats.equippedWeapon) {
            equippedItems.push({
                name: stats.equippedWeapon,
                value: stats.equippedWeapon,
            });
        }

        const artifactTypes = ["Flower", "Plume", "Sands", "Goblet", "Circlet"];

        for (const type of artifactTypes) {
            const field = `equipped${type}` as keyof typeof stats;
            const itemName = stats[field];
            if (itemName && typeof itemName === "string") {
                equippedItems.push({
                    name: itemName,
                    value: itemName,
                });
            }
        }

        const input = i.options.getString("item", false) ?? "";

        let items = equippedItems;
        if (input) {
            items = items.filter((c) =>
                c.name.toLowerCase().includes(input.toLowerCase()),
            );
        }

        if (!is.array(items) || items.length === 0) {
            return i
                .respond([{ name: "No match found.", value: "n/a" }])
                .catch(noop);
        }

        return i.respond(items.slice(0, 25)).catch(noop);
    },

    async execute(i, r) {
        const itemName = i.options.getString("item", true);
        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        if (stats.isHunting) {
            return r.edit(embedComment("You cannot unequip while hunting!"));
        }

        if (itemName === "All") {
            const equippedItems: string[] = [];
            let totalAttackPower = stats.attackPower;
            let totalCritChance = stats.critChance;
            let totalCritValue = stats.critValue;
            let totalMaxHP = stats.maxHP;
            let totalDefChance = stats.defChance;
            let totalDefValue = stats.defValue;

            if (stats.equippedWeapon) {
                const weaponStats = weapons[stats.equippedWeapon as WeaponName];
                totalAttackPower -= weaponStats.attackPower;
                totalCritChance -= weaponStats.critChance || 0;
                totalCritValue -= weaponStats.critValue || 0;
                totalMaxHP -= weaponStats.additionalHP || 0;
                equippedItems.push(stats.equippedWeapon);
            }

            const artifactTypes = [
                "Flower",
                "Plume",
                "Sands",
                "Goblet",
                "Circlet",
            ];
            const updates: any = {};

            for (const type of artifactTypes) {
                const field = `equipped${type}` as keyof typeof stats;
                const artifactName = stats[field];

                if (artifactName && typeof artifactName === "string") {
                    const artifactStats =
                        artifacts[artifactName as ArtifactName];
                    totalAttackPower -= artifactStats.attackPower || 0;
                    totalCritChance -= artifactStats.critChance || 0;
                    totalCritValue -= artifactStats.critValue || 0;
                    totalMaxHP -= artifactStats.maxHP || 0;
                    totalDefChance -= artifactStats.defChance || 0;
                    totalDefValue -= artifactStats.defValue || 0;
                    updates[field] = { set: null };
                    equippedItems.push(artifactName);
                }
            }

            await updateUserStats(i.user.id, {
                equippedWeapon: { set: null },
                attackPower: totalAttackPower,
                critChance: totalCritChance,
                critValue: totalCritValue,
                maxHP: totalMaxHP,
                defChance: totalDefChance,
                defValue: totalDefValue,
                ...updates,
            });

            if (equippedItems.length === 0) {
                return r.edit(
                    embedComment(`You have no items equipped to unequip.`),
                );
            }

            return r.edit(
                embedComment(`You have unequipped all items`, "Green"),
            );
        }

        if (itemName === stats.equippedWeapon) {
            const unequippedWeaponStats =
                weapons[stats.equippedWeapon as WeaponName];

            await updateUserStats(i.user.id, {
                equippedWeapon: { set: null },
                attackPower:
                    stats.attackPower - unequippedWeaponStats.attackPower,
                critChance:
                    stats.critChance - (unequippedWeaponStats.critChance || 0),
                critValue:
                    stats.critValue - (unequippedWeaponStats.critValue || 0),
                maxHP: stats.maxHP - (unequippedWeaponStats.additionalHP || 0),
            });

            return r.edit(
                embedComment(
                    `You have unequipped your weapon: **${stats.equippedWeapon}**.`,
                    "Green",
                ),
            );
        }

        const artifactType = getArtifactType(itemName as ArtifactName);

        if (!artifactType) {
            return r.edit(
                embedComment(
                    `Unable to find the artifact type for "${itemName}"`,
                ),
            );
        }

        const equippedField = `equipped${artifactType}` as keyof typeof stats;

        if (stats[equippedField] === itemName) {
            const artifactStats = artifacts[itemName as ArtifactName];

            await updateUserStats(i.user.id, {
                [equippedField]: { set: null },
                attackPower:
                    stats.attackPower - (artifactStats.attackPower || 0),
                critChance: stats.critChance - (artifactStats.critChance || 0),
                critValue: stats.critValue - (artifactStats.critValue || 0),
                maxHP: stats.maxHP - (artifactStats.maxHP || 0),
                defChance: stats.defChance - (artifactStats.defChance || 0),
                defValue: stats.defValue - (artifactStats.defValue || 0),
            });

            return r.edit(
                embedComment(
                    `You have unequipped your artifact: **${itemName}**.`,
                    "Green",
                ),
            );
        } else {
            return r.edit(
                embedComment(
                    `You don't have the artifact "${itemName}" equipped.`,
                ),
            );
        }
    },
});
