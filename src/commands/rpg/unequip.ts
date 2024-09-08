import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys, is, noop } from "@elara-services/utils";
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
        const list = [...getKeys(weapons), ...getKeys(artifacts)].map((c) => ({
            name: c,
            value: c,
        }));
        const item = i.options.getString("item", false) ?? "";
        if (!item) {
            return i.respond(list.slice(0, 25)).catch(noop);
        }
        const items = list.filter((c) =>
            c.name.toLowerCase().includes(item.toLowerCase()),
        );
        if (!is.array(items)) {
            return i
                .respond([{ name: "No match found for that.", value: "n/a" }])
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

        if (artifactType) {
            const equippedField =
                `equipped${artifactType}` as keyof typeof stats;

            if (stats[equippedField]) {
                const artifactStats = artifacts[itemName as ArtifactName];

                await updateUserStats(i.user.id, {
                    [equippedField]: { set: null },
                    attackPower: stats.attackPower - artifactStats.attackPower,
                    critChance:
                        stats.critChance - (artifactStats.critChance || 0),
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
        }

        return r.edit(
            embedComment(`The item "${itemName}" is not currently equipped.`),
        );
    },
});
