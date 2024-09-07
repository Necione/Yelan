import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { formatChange } from "../../utils/hunt";
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
                .addChoices(
                    ...getKeys(weapons).map((c) => ({
                        name: c,
                        value: c,
                    })),
                    ...getKeys(artifacts).map((c) => ({
                        name: c,
                        value: c,
                    })),
                ),
        ),
    defer: { silent: false },
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

        const updatedStats: string[] = [];

        if (weapons[itemName as WeaponName]) {
            const weaponName = itemName as WeaponName;
            const weapon = stats.inventory.find((c) => c.item === weaponName);

            if (!weapon) {
                return r.edit(
                    embedComment(
                        `You don't have "${weaponName}" in your inventory to equip.\n-# Check your inventory with </rpg:1279824112566665297>`,
                    ),
                );
            }

            if (stats.equippedWeapon) {
                return r.edit(
                    embedComment(
                        `You already have a weapon equipped (**${stats.equippedWeapon}**). Please </unequip:1280334713193496577> it first.`,
                    ),
                );
            }

            const additionalAttackPower = weapons[weaponName].attackPower;
            const additionalCritChance = weapons[weaponName].critChance || 0;
            const additionalCritValue = weapons[weaponName].critValue || 0;

            if (additionalAttackPower !== 0) {
                updatedStats.push(
                    `⚔️ Attack Power: ${formatChange(
                        additionalAttackPower,
                    )} (Total: ${formatChange(
                        stats.attackPower + additionalAttackPower,
                    )})`,
                );
            }
            if (additionalCritChance !== 0) {
                updatedStats.push(
                    `🎯 Crit Chance: ${formatChange(
                        additionalCritChance,
                    )}% (Total: ${formatChange(
                        stats.critChance + additionalCritChance,
                    )}%)`,
                );
            }
            if (additionalCritValue !== 0) {
                updatedStats.push(
                    `💥 Crit Value: ${formatChange(
                        additionalCritValue,
                    )}x (Total: ${formatChange(
                        stats.critValue + additionalCritValue,
                    )}x)`,
                );
            }

            await updateUserStats(i.user.id, {
                equippedWeapon: weaponName,
                attackPower: stats.attackPower + additionalAttackPower,
                critChance: stats.critChance + additionalCritChance,
                critValue: stats.critValue + additionalCritValue,
            });

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
                        `You don't have "${artifactName}" in your inventory to equip.\n-# Check your inventory with </rpg:1279824112566665297>`,
                    ),
                );
            }

            const artifactType = getArtifactType(artifactName);
            const equippedField =
                `equipped${artifactType}` as keyof typeof stats;

            if (stats[equippedField]) {
                return r.edit(
                    embedComment(
                        `You already have an artifact of type **${artifactType}** equipped (**${stats[equippedField]}**). Please </unequip:1280334713193496577> it first.`,
                    ),
                );
            }

            const additionalAttackPower =
                artifacts[artifactName].attackPower || 0;
            const additionalCritChance =
                artifacts[artifactName].critChance || 0;
            const additionalCritValue = artifacts[artifactName].critValue || 0;
            const additionalMaxHP = artifacts[artifactName].maxHP || 0;
            const additionalDefChance = artifacts[artifactName].defChance || 0;
            const additionalDefValue = artifacts[artifactName].defValue || 0;

            if (additionalAttackPower !== 0) {
                updatedStats.push(
                    `⚔️ Attack Power: ${formatChange(
                        additionalAttackPower,
                    )} (Total: ${formatChange(
                        stats.attackPower + additionalAttackPower,
                    )})`,
                );
            }
            if (additionalCritChance !== 0) {
                updatedStats.push(
                    `🎯 Crit Chance: ${formatChange(
                        additionalCritChance,
                    )}% (Total: ${formatChange(
                        stats.critChance + additionalCritChance,
                    )}%)`,
                );
            }
            if (additionalCritValue !== 0) {
                updatedStats.push(
                    `💥 Crit Value: ${formatChange(
                        additionalCritValue,
                    )}x (Total: ${formatChange(
                        stats.critValue + additionalCritValue,
                    )}x)`,
                );
            }
            if (additionalMaxHP !== 0) {
                updatedStats.push(
                    `❤️ Max HP: ${formatChange(
                        additionalMaxHP,
                    )} (Total: ${formatChange(stats.maxHP + additionalMaxHP)})`,
                );
            }
            if (additionalDefChance !== 0) {
                updatedStats.push(
                    `🛡️ Def Chance: ${formatChange(
                        additionalDefChance,
                    )}% (Total: ${formatChange(
                        stats.defChance + additionalDefChance,
                    )}%)`,
                );
            }
            if (additionalDefValue !== 0) {
                updatedStats.push(
                    `🛡️ Def Value: ${formatChange(
                        additionalDefValue,
                    )} (Total: ${formatChange(
                        stats.defValue + additionalDefValue,
                    )})`,
                );
            }

            await updateUserStats(i.user.id, {
                [equippedField]: artifactName,
                attackPower: stats.attackPower + additionalAttackPower,
                critChance: stats.critChance + additionalCritChance,
                critValue: stats.critValue + additionalCritValue,
                maxHP: stats.maxHP + additionalMaxHP,
                defChance: stats.defChance + additionalDefChance,
                defValue: stats.defValue + additionalDefValue,
            });

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
