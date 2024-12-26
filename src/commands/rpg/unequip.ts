import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, make, noop } from "@elara-services/utils";
import { type UserCharacter } from "@prisma/client";
import { SlashCommandBuilder } from "discord.js";
import {
    getUserCharacters,
    getUserStats,
    syncCharacter,
    syncStats,
    updateUserCharacter,
    updateUserStats,
} from "../../services";
import {
    calculateCharacterStatChanges,
    calculateStatChanges,
    getCharacterSetBonusMessages,
    getSetBonusMessages,
} from "../../utils/artifactHelper";
import type { ArtifactType } from "../../utils/rpgitems/artifacts";
import {
    getArtifactType,
    type ArtifactName,
} from "../../utils/rpgitems/artifacts";

const artifactTypes = make.array<ArtifactType>([
    "Flower",
    "Plume",
    "Sands",
    "Goblet",
    "Circlet",
]);

export const unequip = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("unequip")
        .setDescription(
            "[RPG] Unequip your currently equipped weapon or artifact from a character or yourself (Traveller).",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("character")
                .setDescription("The character or 'Traveller' to unequip from")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The weapon or artifact to unequip")
                .setRequired(true)
                .setAutocomplete(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const focused = i.options.getFocused(true);
        const optionName = focused.name;
        const input = focused.value.toLowerCase();

        if (optionName === "character") {
            const characters = await getUserCharacters(i.user.id);
            const baseEntries = [{ name: "Traveller", value: "Traveller" }];

            const charEntries = characters.map((c) => ({
                name: c.nickname ? `${c.nickname} (${c.name})` : c.name,
                value: c.name,
            }));

            const all = baseEntries.concat(charEntries);
            const filtered = all.filter((c) =>
                c.name.toLowerCase().includes(input),
            );

            if (!is.array(filtered)) {
                return i
                    .respond([{ name: "No match found.", value: "n/a" }])
                    .catch(noop);
            }

            return i.respond(filtered.slice(0, 25)).catch(noop);
        } else if (optionName === "item") {
            const characterName = i.options.getString("character");
            if (!characterName || characterName === "n/a") {
                return i
                    .respond([
                        {
                            name: "Please select a character or Traveller first.",
                            value: "n/a",
                        },
                    ])
                    .catch(noop);
            }

            if (characterName.toLowerCase() === "traveller") {
                const stats = await getUserStats(i.user.id);
                if (!stats) {
                    return i
                        .respond([{ name: "No stats found.", value: "n/a" }])
                        .catch(noop);
                }

                const equippedItems = make.array<{
                    name: string;
                    value: string;
                }>();
                equippedItems.push({ name: "All", value: "All" });
                if (stats.equippedWeapon) {
                    equippedItems.push({
                        name: stats.equippedWeapon,
                        value: stats.equippedWeapon,
                    });
                }

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

                let items = equippedItems;
                if (input) {
                    items = items.filter((c) =>
                        c.name.toLowerCase().includes(input),
                    );
                }

                if (!is.array(items)) {
                    return i
                        .respond([{ name: "No match found.", value: "n/a" }])
                        .catch(noop);
                }

                return i.respond(items.slice(0, 25)).catch(noop);
            } else {
                const characters = await getUserCharacters(i.user.id);
                const character = characters.find(
                    (c) => c.name.toLowerCase() === characterName.toLowerCase(),
                );
                if (!character) {
                    return i
                        .respond([
                            { name: "Character not found.", value: "n/a" },
                        ])
                        .catch(noop);
                }

                const equippedItems = make.array<{
                    name: string;
                    value: string;
                }>();

                equippedItems.push({
                    name: "All",
                    value: "All",
                });

                equippedItems.push({
                    name: character.equippedWeapon || "No Weapon Equipped",
                    value: character.equippedWeapon || "No Weapon Equipped",
                });

                for (const type of artifactTypes) {
                    const field = `equipped${type}` as keyof typeof character;
                    const itemName = character[field];
                    if (itemName && typeof itemName === "string") {
                        equippedItems.push({
                            name: itemName,
                            value: itemName,
                        });
                    }
                }

                let items = equippedItems;
                if (input) {
                    items = items.filter((c) =>
                        c.name.toLowerCase().includes(input),
                    );
                }

                if (!is.array(items)) {
                    return i
                        .respond([{ name: "No match found.", value: "n/a" }])
                        .catch(noop);
                }

                return i.respond(items.slice(0, 25)).catch(noop);
            }
        }
    },

    async execute(i, r) {
        const characterName = i.options.getString("character", true);
        const itemName = i.options.getString("item", true);

        if (itemName === "n/a") {
            return r.edit(embedComment(`You provided an invalid item name.`));
        }

        if (characterName.toLowerCase() === "traveller") {
            let stats = await getUserStats(i.user.id);
            if (!stats) {
                return r.edit(
                    embedComment(
                        `No stats found for you, please set up your profile.`,
                    ),
                );
            }

            if (stats.isHunting) {
                return r.edit(
                    embedComment("You cannot unequip while hunting!"),
                );
            }

            const beforeStats = { ...stats };

            if (itemName === "All") {
                if (stats.castQueue.length > 0 && stats.equippedWeapon) {
                    return r.edit(
                        embedComment(
                            `You cannot unequip your weapon while you have spells in your queue.`,
                        ),
                    );
                }

                const updates: Partial<{
                    equippedWeapon: null;
                    equippedFlower: null;
                    equippedPlume: null;
                    equippedSands: null;
                    equippedGoblet: null;
                    equippedCirclet: null;
                }> = {};

                if (stats.equippedWeapon) {
                    updates.equippedWeapon = null;
                }

                for (const type of artifactTypes) {
                    const field = `equipped${type}` as keyof typeof stats;
                    if (stats[field]) {
                        updates[field as keyof typeof updates] = null;
                    }
                }

                if (Object.keys(updates).length === 0) {
                    return r.edit(
                        embedComment("You have no items equipped to unequip."),
                    );
                }

                await updateUserStats(i.user.id, updates);
                stats = await syncStats(i.user.id);

                if (!stats) {
                    return r.edit(
                        embedComment(`Failed to sync stats after unequipping.`),
                    );
                }

                const statChanges = calculateStatChanges(beforeStats, stats);
                const setBonusMessages = getSetBonusMessages(
                    beforeStats,
                    stats,
                    "deactivated",
                );

                return r.edit(
                    embedComment(
                        `You have unequipped all items.\n${[
                            ...statChanges,
                            ...setBonusMessages,
                        ].join("\n")}`,
                        "Green",
                    ),
                );
            }

            if (itemName === stats.equippedWeapon) {
                if (stats.castQueue.length > 0) {
                    return r.edit(
                        embedComment(
                            `You cannot unequip your weapon while you have spells in your queue.`,
                        ),
                    );
                }

                await updateUserStats(i.user.id, {
                    equippedWeapon: { set: null },
                });

                stats = await syncStats(i.user.id);
                if (!stats) {
                    return r.edit(embedComment(`Failed to sync stats.`));
                }

                const statChanges = calculateStatChanges(beforeStats, stats);
                return r.edit(
                    embedComment(
                        `You have unequipped your weapon: **${itemName}**.\n${statChanges.join(
                            "\n",
                        )}`,
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

            const equippedField =
                `equipped${artifactType}` as keyof typeof stats;

            if (stats[equippedField] === itemName) {
                await updateUserStats(i.user.id, {
                    [equippedField]: { set: null },
                });

                stats = await syncStats(i.user.id);
                if (!stats) {
                    return r.edit(embedComment(`Failed to sync stats.`));
                }
                const statChanges = calculateStatChanges(beforeStats, stats);
                const setBonusMessages = getSetBonusMessages(
                    beforeStats,
                    stats,
                    "deactivated",
                );

                return r.edit(
                    embedComment(
                        `You have unequipped your artifact: **${itemName}**.\n${[
                            ...statChanges,
                            ...setBonusMessages,
                        ].join("\n")}`,
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
        } else {
            const characters = await getUserCharacters(i.user.id);
            const character = characters.find(
                (c) => c.name.toLowerCase() === characterName.toLowerCase(),
            );
            if (!character) {
                return r.edit(
                    embedComment(
                        `You don't have a character named "${characterName}".`,
                    ),
                );
            }

            const before = { ...character };

            if (itemName === "All") {
                const stats = await getUserStats(i.user.id);
                if (!stats) {
                    return r.edit(
                        embedComment(
                            `No stats found for you, please set up your profile.`,
                        ),
                    );
                }

                if (stats.castQueue.length > 0 && character.equippedWeapon) {
                    return r.edit(
                        embedComment(
                            `You cannot unequip your weapon while you have spells in your queue.`,
                        ),
                    );
                }

                const updates: Partial<{
                    equippedWeapon: null;
                    equippedFlower: null;
                    equippedPlume: null;
                    equippedSands: null;
                    equippedGoblet: null;
                    equippedCirclet: null;
                }> = {};

                if (character.equippedWeapon) {
                    updates.equippedWeapon = null;
                }
                for (const type of artifactTypes) {
                    const field = `equipped${type}` as keyof typeof character;
                    if (character[field]) {
                        updates[field as keyof typeof updates] = null;
                    }
                }

                if (Object.keys(updates).length === 0) {
                    return r.edit(
                        embedComment(
                            `"${
                                character.nickname
                                    ? `${character.nickname} (${character.name})`
                                    : character.name
                            }" has no items equipped to unequip.`,
                        ),
                    );
                }

                await updateUserCharacter(character.id, updates);
                const updatedChar = await syncCharacter(character.id);

                if (!updatedChar) {
                    return r.edit(
                        embedComment(
                            `Failed to sync character stats after unequipping.`,
                        ),
                    );
                }

                const statChanges = calculateCharacterStatChanges(
                    before,
                    updatedChar as UserCharacter,
                );
                const setBonusMessages = getCharacterSetBonusMessages(
                    before,
                    updatedChar as UserCharacter,
                    "deactivated",
                );

                return r.edit(
                    embedComment(
                        `You have unequipped all items from **${
                            character.nickname
                                ? `${character.nickname} (${character.name})`
                                : character.name
                        }**.\n${[...statChanges, ...setBonusMessages].join(
                            "\n",
                        )}`,
                        "Green",
                    ),
                );
            }

            if (character.equippedWeapon === itemName) {
                const stats = await getUserStats(i.user.id);
                if (!stats) {
                    return r.edit(
                        embedComment(
                            `No stats found for you, please set up your profile.`,
                        ),
                    );
                }

                if (stats.castQueue.length > 0) {
                    return r.edit(
                        embedComment(
                            `You cannot unequip your weapon while you have spells in your queue.`,
                        ),
                    );
                }

                await updateUserCharacter(character.id, {
                    equippedWeapon: null,
                });

                const updatedChar = await syncCharacter(character.id);
                if (!updatedChar) {
                    return r.edit(
                        embedComment(
                            `Failed to sync character stats after unequipping weapon.`,
                        ),
                    );
                }

                const statChanges = calculateCharacterStatChanges(
                    before,
                    updatedChar as UserCharacter,
                );
                return r.edit(
                    embedComment(
                        `You have unequipped the weapon: **${itemName}** from **${
                            character.nickname
                                ? `${character.nickname} (${character.name})`
                                : character.name
                        }**.\n${statChanges.join("\n")}`,
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

            const equippedField =
                `equipped${artifactType}` as keyof typeof character;

            if (character[equippedField] === itemName) {
                await updateUserCharacter(character.id, {
                    [equippedField]: null,
                });

                const updatedChar = await syncCharacter(character.id);
                if (!updatedChar) {
                    return r.edit(
                        embedComment(
                            `Failed to sync character stats after unequipping artifact.`,
                        ),
                    );
                }

                const statChanges = calculateCharacterStatChanges(
                    before,
                    updatedChar as UserCharacter,
                );
                const setBonusMessages = getCharacterSetBonusMessages(
                    before,
                    updatedChar as UserCharacter,
                    "deactivated",
                );

                return r.edit(
                    embedComment(
                        `You have unequipped the artifact: **${itemName}** from **${
                            character.nickname
                                ? `${character.nickname} (${character.name})`
                                : character.name
                        }**.\n${[...statChanges, ...setBonusMessages].join(
                            "\n",
                        )}`,
                        "Green",
                    ),
                );
            } else {
                return r.edit(
                    embedComment(
                        `**${
                            character.nickname
                                ? `${character.nickname} (${character.name})`
                                : character.name
                        }** doesn't have the item "${itemName}" equipped.`,
                    ),
                );
            }
        }
    },
});
