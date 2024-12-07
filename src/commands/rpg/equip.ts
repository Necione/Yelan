import type { SlashCommand } from "@elara-services/botbuilder";
import { buildCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys, is, noop } from "@elara-services/utils";
import type { UserCharacter } from "@prisma/client";
import { type UserStats } from "@prisma/client";
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
import type { ArtifactName } from "../../utils/rpgitems/artifacts";
import { artifacts, getArtifactType } from "../../utils/rpgitems/artifacts";
import type { WeaponName } from "../../utils/rpgitems/weapons";
import { weapons } from "../../utils/rpgitems/weapons";

export const equip = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("equip")
        .setDescription(
            "[RPG] Equip a weapon or an artifact from your inventory to a character or yourself (Traveller).",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("character")
                .setDescription(
                    "The character or 'Traveller' to equip the item to",
                )
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The weapon or artifact to equip")
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
            let list = [...getKeys(weapons), ...getKeys(artifacts)].map(
                (c) => ({
                    name: String(c),
                    value: c,
                }),
            );
            const stats = await getUserStats(i.user.id);
            if (!stats || !is.array(stats.inventory)) {
                return i
                    .respond([
                        {
                            name: "You have nothing in your inventory",
                            value: "n/a",
                        },
                    ])
                    .catch(noop);
            }
            list = list.filter((r) =>
                stats.inventory.find((cc) => cc.item === r.name),
            );
            const item = i.options.getString("item", false) ?? "";
            if (!item) {
                return i.respond(list.slice(0, 25)).catch(noop);
            }
            const items = list.filter((c) =>
                c.name.toLowerCase().includes(item.toLowerCase()),
            );
            if (!is.array(items)) {
                return i
                    .respond([
                        { name: "No match found for that.", value: "n/a" },
                    ])
                    .catch(noop);
            }
            return i.respond(items.slice(0, 25)).catch(noop);
        }
    },
    async execute(i, r) {
        const itemName = i.options.getString("item", true);
        const characterName = i.options.getString("character", true);

        if (itemName === "n/a") {
            return r.edit(embedComment(`You provided an invalid item name.`));
        }

        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        if (stats.isHunting) {
            return r.edit(embedComment("You cannot equip while hunting!"));
        }

        const invItem = stats.inventory.find((c) => c.item === itemName);
        if (!invItem) {
            return r.edit(
                embedComment(`You don't have "${itemName}" in your inventory.`),
            );
        }

        const equippedCount = await getEquippedCount(i.user.id, itemName);

        if (equippedCount >= invItem.amount) {
            return r.edit(
                embedComment(
                    `You don't have enough "${itemName}" to equip another one.\n(You have ${invItem.amount}, and ${equippedCount} are already equipped.)`,
                ),
            );
        }

        if (characterName.toLowerCase() === "traveller") {
            const beforeStats = { ...stats } as UserStats;

            if (weapons[itemName as WeaponName]) {
                const weaponName = itemName as WeaponName;

                if (stats.equippedWeapon) {
                    return r.edit(
                        embedComment(
                            `You already have a weapon equipped (**${stats.equippedWeapon}**). Unequip it first.`,
                        ),
                    );
                }

                await updateUserStats(i.user.id, {
                    equippedWeapon: { set: weaponName },
                });

                const updatedStats = await syncStats(i.user.id);
                if (!updatedStats) {
                    return r.edit(embedComment(`Failed to sync stats.`));
                }

                const statChanges = calculateStatChanges(
                    beforeStats,
                    updatedStats as UserStats,
                );

                return r.edit(
                    embedComment(
                        `You have equipped **${weaponName}**!\n${statChanges.join(
                            "\n",
                        )}`,
                        "Green",
                    ),
                );
            }

            if (artifacts[itemName as ArtifactName]) {
                const artifactName = itemName as ArtifactName;
                const artifactType = getArtifactType(artifactName);
                if (!artifactType) {
                    return r.edit(
                        embedComment(
                            `Unable to find the artifact type for "${artifactName}".`,
                        ),
                    );
                }
                const equippedField =
                    `equipped${artifactType}` as keyof typeof stats;

                if (stats[equippedField]) {
                    return r.edit(
                        embedComment(
                            `You already have a ${artifactType} equipped (**${stats[equippedField]}**). Please unequip it first.`,
                        ),
                    );
                }

                await updateUserStats(i.user.id, {
                    [equippedField]: { set: artifactName },
                });

                const updatedStats = await syncStats(i.user.id);
                if (!updatedStats) {
                    return r.edit(embedComment(`Failed to sync stats.`));
                }

                const statChanges = calculateStatChanges(
                    beforeStats,
                    updatedStats,
                );
                const setBonusMessages = getSetBonusMessages(
                    beforeStats,
                    updatedStats,
                    "activated",
                );

                return r.edit(
                    embedComment(
                        `You have equipped **${artifactName}**!\n${[
                            ...statChanges,
                            ...setBonusMessages,
                        ].join("\n")}`,
                        "Green",
                    ),
                );
            }

            return r.edit(
                embedComment(`The item "${itemName}" doesn't exist.`),
            );
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

            if (weapons[itemName as WeaponName]) {
                const weaponName = itemName as WeaponName;

                if (character.equippedWeapon) {
                    return r.edit(
                        embedComment(
                            `${
                                character.nickname
                                    ? `${character.nickname} (${character.name})`
                                    : character.name
                            } already has a weapon equipped (**${
                                character.equippedWeapon
                            }**). Unequip it first.`,
                        ),
                    );
                }

                await updateUserCharacter(character.id, {
                    equippedWeapon: { set: weaponName },
                });

                const updatedChar = await syncCharacter(character.id);
                if (!updatedChar) {
                    return r.edit(
                        embedComment(`Failed to sync character stats.`),
                    );
                }

                const statChanges = calculateCharacterStatChanges(
                    before,
                    updatedChar as UserCharacter,
                );
                return r.edit(
                    embedComment(
                        `You have equipped **${weaponName}** on **${
                            character.nickname
                                ? `${character.nickname} (${character.name})`
                                : character.name
                        }**!\n${statChanges.join("\n")}`,
                        "Green",
                    ),
                );
            }

            if (artifacts[itemName as ArtifactName]) {
                const artifactName = itemName as ArtifactName;
                const artifactType = getArtifactType(artifactName);
                if (!artifactType) {
                    return r.edit(
                        embedComment(
                            `Unable to find the artifact type for "${artifactName}".`,
                        ),
                    );
                }
                const field =
                    `equipped${artifactType}` as keyof typeof character;

                if (character[field]) {
                    return r.edit(
                        embedComment(
                            `${
                                character.nickname
                                    ? `${character.nickname} (${character.name})`
                                    : character.name
                            } already has a ${artifactType} equipped (**${
                                character[field]
                            }**). Unequip it first.`,
                        ),
                    );
                }

                await updateUserCharacter(character.id, {
                    [field]: { set: artifactName },
                });

                const updatedChar = await syncCharacter(character.id);
                if (!updatedChar) {
                    return r.edit(
                        embedComment(`Failed to sync character stats.`),
                    );
                }

                const statChanges = calculateCharacterStatChanges(
                    before,
                    updatedChar as UserCharacter,
                );
                const setBonusMessages = getCharacterSetBonusMessages(
                    before,
                    updatedChar as UserCharacter,
                    "activated",
                );

                return r.edit(
                    embedComment(
                        `You have equipped **${artifactName}** on **${
                            character.nickname
                                ? `${character.nickname} (${character.name})`
                                : character.name
                        }**!\n${[...statChanges, ...setBonusMessages].join(
                            "\n",
                        )}`,
                        "Green",
                    ),
                );
            }

            return r.edit(
                embedComment(`The item "${itemName}" doesn't exist.`),
            );
        }
    },
});

const artifactTypes = [
    "Flower",
    "Plume",
    "Sands",
    "Goblet",
    "Circlet",
] as const;

async function getEquippedCount(userId: string, itemName: string) {
    const stats = await getUserStats(userId);
    let count = 0;
    if (stats) {
        if (stats.equippedWeapon === itemName) {
            count++;
        }
        for (const type of artifactTypes) {
            const field = `equipped${type}` as keyof typeof stats;
            if (stats[field] === itemName) {
                count++;
            }
        }
    }

    const characters = await getUserCharacters(userId);
    for (const c of characters) {
        if (c.equippedWeapon === itemName) {
            count++;
        }
        for (const type of artifactTypes) {
            const field = `equipped${type}` as keyof typeof c;
            if (c[field] === itemName) {
                count++;
            }
        }
    }

    return count;
}
