import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys, is, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, syncStats, updateUserStats } from "../../services";
import {
    calculateStatChanges,
    getSetBonusMessages,
} from "../../utils/artifactHelper";
import {
    artifacts,
    getArtifactType,
    type ArtifactName,
} from "../../utils/rpgitems/artifacts";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const equip = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("equip")
        .setDescription(
            "[RPG] Equip a weapon or an artifact from your inventory.",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The weapon or artifact to equip")
                .setRequired(true)
                .setAutocomplete(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const list = [...getKeys(weapons), ...getKeys(artifacts)].map((c) => ({
            name: String(c),
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
        let stats = await getUserStats(i.user.id);

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

        const updatedStats: string[] = [];
        const beforeStats = { ...stats };

        if (weapons[itemName as WeaponName]) {
            const weaponName = itemName as WeaponName;
            const weapon = stats.inventory.find((c) => c.item === weaponName);

            if (!weapon) {
                return r.edit(
                    embedComment(
                        `You don't have "${weaponName}" in your inventory to equip.\n- Check your inventory with </bag:1282456807100387411>`,
                    ),
                );
            }

            if (stats.equippedWeapon) {
                return r.edit(
                    embedComment(
                        `You already have a weapon equipped (**${stats.equippedWeapon}**). Please unequip it first.`,
                    ),
                );
            }

            await updateUserStats(i.user.id, {
                equippedWeapon: weaponName,
            });

            stats = await syncStats(i.user.id);

            const afterStats = { ...stats };

            const statChanges = calculateStatChanges(beforeStats, afterStats);
            updatedStats.push(...statChanges);

            return r.edit(
                embedComment(
                    `You have equipped **${weaponName}**!\n${updatedStats.join(
                        "\n",
                    )}`,
                    "Green",
                ),
            );
        }

        if (artifacts[itemName as ArtifactName]) {
            const artifactName = itemName as ArtifactName;
            const artifact = stats.inventory.find(
                (c) => c.item === artifactName,
            );

            if (!artifact) {
                return r.edit(
                    embedComment(
                        `You don't have "${artifactName}" in your inventory to equip.\n- Check your inventory with </bag:1282456807100387411>`,
                    ),
                );
            }

            const artifactType = getArtifactType(artifactName);
            if (!artifactType) {
                return r.edit(
                    embedComment(
                        `Unable to find the artifact type for "${artifactName}"`,
                    ),
                );
            }
            const equippedField =
                `equipped${artifactType}` as keyof typeof stats;

            if (stats[equippedField]) {
                return r.edit(
                    embedComment(
                        `You already have an artifact of type **${artifactType}** equipped (**${stats[equippedField]}**). Please unequip it first.`,
                    ),
                );
            }

            await updateUserStats(i.user.id, {
                [equippedField]: artifactName,
            });

            stats = await syncStats(i.user.id);

            const afterStats = { ...stats };

            const statChanges = calculateStatChanges(beforeStats, afterStats);
            updatedStats.push(...statChanges);

            const setBonusMessages = getSetBonusMessages(
                beforeStats,
                afterStats,
                "activated",
            );
            updatedStats.push(...setBonusMessages);

            return r.edit(
                embedComment(
                    `You have equipped **${artifactName}**!\n${updatedStats.join(
                        "\n",
                    )}`,
                    "Green",
                ),
            );
        }

        return r.edit(embedComment(`The item "${itemName}" doesn't exist.`));
    },
});
