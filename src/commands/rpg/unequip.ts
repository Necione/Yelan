import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, make, noop } from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, syncStats, updateUserStats } from "../../services";
import {
    calculateStatChanges,
    getSetBonusMessages,
} from "../../utils/artifactHelper";
import type { ArtifactType } from "../../utils/rpgitems/artifacts";
import {
    getArtifactType,
    type ArtifactName,
} from "../../utils/rpgitems/artifacts";

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

        const equippedItems = make.array<{ name: string; value: string }>();

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

        const artifactTypes = make.array<ArtifactType>([
            "Flower",
            "Plume",
            "Sands",
            "Goblet",
            "Circlet",
        ]);

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

        if (!is.array(items)) {
            return i
                .respond([{ name: "No match found.", value: "n/a" }])
                .catch(noop);
        }

        return i.respond(items.slice(0, 25)).catch(noop);
    },

    async execute(i, r) {
        const itemName = i.options.getString("item", true);
        let stats = await getUserStats(i.user.id);

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

        if (stats.castQueue.length > 0) {
            if (itemName === "All" && stats.equippedWeapon) {
                return r.edit(
                    embedComment(
                        `You cannot unequip your weapon while you have spells in your queue.`,
                    ),
                );
            }

            if (itemName === stats.equippedWeapon) {
                return r.edit(
                    embedComment(
                        `You cannot unequip your weapon while you have spells in your queue.`,
                    ),
                );
            }
        }

        const updatedStats = make.array<string>();
        const beforeStats = { ...stats };

        if (itemName === "All") {
            const updates: Prisma.UserStatsUpdateInput = {};
            const unequippableItems = make.array<string>();

            if (stats.equippedWeapon) {
                if (stats.castQueue.length > 0) {
                    unequippableItems.push(
                        `**${stats.equippedWeapon}** (Weapon)`,
                    );
                } else {
                    updates.equippedWeapon = { set: null };
                }
            }

            const artifactTypes = make.array<ArtifactType>([
                "Flower",
                "Plume",
                "Sands",
                "Goblet",
                "Circlet",
            ]);

            for (const type of artifactTypes) {
                const field = `equipped${type}` as keyof typeof stats;
                if (stats[field]) {
                    // @ts-ignore
                    updates[field] = { set: null };
                }
            }

            if (
                unequippableItems.length > 0 &&
                Object.keys(updates).length === 0
            ) {
                return r.edit(
                    embedComment(
                        `You cannot unequip the following items while you have spells in your queue:\n${unequippableItems
                            .map((item) => `- ${item}`)
                            .join("\n")}`,
                    ),
                );
            }

            if (unequippableItems.length > 0) {
                r.edit(
                    embedComment(
                        `You cannot unequip the following items while you have spells in your queue:\n${unequippableItems
                            .map((item) => `- ${item}`)
                            .join(
                                "\n",
                            )}\n\nOther equipped artifacts have been unequipped.`,
                        "Yellow",
                    ),
                ).catch(noop);
            }

            if (Object.keys(updates).length === 0) {
                return r.edit(
                    embedComment(`You have no items equipped to unequip.`),
                );
            }

            await updateUserStats(i.user.id, updates);

            stats = await syncStats(i.user.id);

            const statChanges = calculateStatChanges(beforeStats, stats);
            updatedStats.push(...statChanges);

            const setBonusMessages = getSetBonusMessages(
                beforeStats,
                stats,
                "deactivated",
            );
            updatedStats.push(...setBonusMessages);

            return r.edit(
                embedComment(
                    `You have unequipped all items you can.\n${updatedStats.join(
                        "\n",
                    )}`,
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

            const statChanges = calculateStatChanges(beforeStats, stats);
            updatedStats.push(...statChanges);

            return r.edit(
                embedComment(
                    `You have unequipped your weapon: **${itemName}**.\n${updatedStats.join(
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

        const equippedField = `equipped${artifactType}` as keyof typeof stats;

        if (stats[equippedField] === itemName) {
            await updateUserStats(i.user.id, {
                [equippedField]: { set: null },
            });

            stats = await syncStats(i.user.id);
            const statChanges = calculateStatChanges(beforeStats, stats);
            updatedStats.push(...statChanges);

            const setBonusMessages = getSetBonusMessages(
                beforeStats,
                stats,
                "deactivated",
            );
            updatedStats.push(...setBonusMessages);

            return r.edit(
                embedComment(
                    `You have unequipped your artifact: **${itemName}**.\n${updatedStats.join(
                        "\n",
                    )}`,
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
