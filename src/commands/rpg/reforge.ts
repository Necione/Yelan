import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import {
    embedComment,
    getRandom,
    is,
    noop,
    snowflakes,
} from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserCharacters,
    getUserStats,
    removeBalance,
    updateUserStats,
} from "../../services";
import { getAmount } from "../../utils";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";
import { getBaseName, prefixes } from "./handlers/utils";

export const reforge = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("reforge")
        .setDescription(
            "[RPG] Reforge one of your weapons, changing its prefix.",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("weapon")
                .setDescription("The weapon you want to reforge")
                .setRequired(true)
                .setAutocomplete(true),
        ),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async autocomplete(i) {
        const stats = await getUserStats(i.user.id);
        if (!stats || !is.array(stats.inventory)) {
            return i
                .respond([{ name: "No items found.", value: "n/a" }])
                .catch(noop);
        }

        const focusedValue = i.options.getFocused()?.toLowerCase() || "";
        const weaponsInInv = stats.inventory.filter(
            (item) => weapons[item.item as WeaponName],
        );

        const options = weaponsInInv.map((item) => ({
            name: item.item,
            value: item.item,
        }));

        const filteredOptions = options.filter((option) =>
            option.name.toLowerCase().includes(focusedValue),
        );

        if (!filteredOptions.length) {
            return i
                .respond([{ name: "No weapons found.", value: "n/a" }])
                .catch(noop);
        }

        return i.respond(filteredOptions.slice(0, 25)).catch(noop);
    },
    async execute(i, r) {
        const weaponName = i.options.getString("weapon", true);

        if (weaponName === "n/a") {
            return r.edit(embedComment("You provided an invalid weapon name."));
        }

        const userProfile = await getProfileByUserId(i.user.id);
        if (!userProfile) {
            return r.edit(
                embedComment(
                    "No profile found for your user. Please set up your profile.",
                ),
            );
        }

        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    "No stats found for you. Please set up your profile.",
                ),
            );
        }

        if (stats.isHunting) {
            return r.edit(
                embedComment("You cannot reforge weapons while hunting!"),
            );
        }

        const invItem = stats.inventory.find(
            (item) => item.item === weaponName,
        );
        if (!invItem || invItem.amount < 1) {
            return r.edit(
                embedComment(
                    `You don't have the weapon **${weaponName}** in your inventory.`,
                ),
            );
        }

        const userCharacters = await getUserCharacters(i.user.id);

        const isEquippedOnCharacter = userCharacters.some((character) => {
            return character.equippedWeapon === weaponName;
        });

        if (isEquippedOnCharacter || stats.equippedWeapon === weaponName) {
            return r.edit(
                embedComment(
                    `You cannot reforge "${weaponName}" because it is currently equipped.`,
                ),
            );
        }

        if (!weapons[weaponName as WeaponName]) {
            return r.edit(
                embedComment(`**${weaponName}** is not a valid weapon.`),
            );
        }

        const reforgeCost = 500;
        if (userProfile.balance < reforgeCost) {
            return r.edit(
                embedComment(
                    `You don't have enough coins to reforge.\n- You need at least ${getAmount(
                        reforgeCost,
                    )}.`,
                ),
            );
        }

        const baseName = getBaseName(weaponName);
        let newPrefix;
        const legendaryChance = Math.random() * 100;
        if (legendaryChance <= 0.5) {
            newPrefix = "Legendary";
        } else {
            newPrefix = getRandom(prefixes);
        }
        const newWeaponName = `${newPrefix} ${baseName}`;

        if (!weapons[newWeaponName as WeaponName]) {
            return r.edit(
                embedComment(
                    `Failed to find a reforged variant for **${baseName}**. Please try again.`,
                ),
            );
        }

        // Update inventory for a single item:
        // If the player has more than one of the original weapon, we only convert one.
        const updatedInventory = [...stats.inventory];
        const itemIndex = updatedInventory.findIndex(
            (item) => item.item === weaponName,
        );
        if (itemIndex === -1) {
            return r.edit(
                embedComment(
                    "Couldn't find the specified weapon in your inventory.",
                ),
            );
        }

        const originalItem = updatedInventory[itemIndex];
        if (originalItem.amount > 1) {
            // Reduce the amount by 1 for the old weapon
            updatedInventory[itemIndex] = {
                ...originalItem,
                amount: originalItem.amount - 1,
            };
            // Add a new entry for the reforged weapon
            updatedInventory.push({
                id: snowflakes.generate(),
                item: newWeaponName,
                amount: 1,
                metadata: null,
            });
        } else {
            // If there's only one, just rename it
            updatedInventory[itemIndex] = {
                ...originalItem,
                item: newWeaponName,
            };
        }

        await updateUserStats(i.user.id, {
            inventory: { set: updatedInventory },
        });
        await removeBalance(
            i.user.id,
            reforgeCost,
            true,
            `Reforged ${weaponName} into ${newWeaponName}`,
        );

        return r.edit(
            embedComment(
                `Successfully reforged **${weaponName}** into **${newWeaponName}** at a cost of ${getAmount(
                    reforgeCost,
                )}.`,
                "Green",
            ),
        );
    },
});
