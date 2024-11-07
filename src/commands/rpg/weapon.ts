import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";
import { syncStats } from "../../services/userStats";
import { weaponAdvantages } from "../../utils/hunt";
import type { MonsterGroup } from "../../utils/monsterHelper";
import type { WeaponType } from "../../utils/rpgitems/weapons";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const weapon = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("weapon")
        .setDescription(
            "[RPG] Displays your currently equipped weapon and its runes.",
        )
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        try {
            const profile = await getProfileByUserId(i.user.id);
            if (!profile) {
                return r.edit(
                    embedComment(
                        `You don't have a user profile yet. Please create one using \`/profile\`.`,
                    ),
                );
            }

            if (profile.locked) {
                return r.edit(
                    embedComment(
                        `Your user profile is locked. You cannot use this command.`,
                    ),
                );
            }

            const stats = await syncStats(i.user.id);
            if (!stats) {
                return r.edit(embedComment(`No stats found for you.`));
            }

            if (!stats.equippedWeapon) {
                return r.edit(
                    embedComment(`You don't have any weapon equipped.`),
                );
            }

            const weaponName = stats.equippedWeapon as WeaponName;
            const equippedWeapon = weapons[weaponName];

            if (!equippedWeapon) {
                return r.edit(
                    embedComment(`Your equipped weapon could not be found.`),
                );
            }

            const weaponStats: string[] = [];
            for (const [key, value] of Object.entries(equippedWeapon)) {
                if (
                    [
                        "emoji",
                        "imageURL",
                        "sellPrice",
                        "chestChance",
                        "minWorldLevel",
                    ].includes(key)
                ) {
                    continue;
                }

                if (typeof value === "number" && value === 0) {
                    continue;
                }

                const statName = capitalizeFirstLetter(key);

                let statValue = "";
                if (typeof value === "number") {
                    statValue = `\`${value.toFixed(2)}\``;
                } else if (typeof value === "string") {
                    statValue = `\`${value}\``;
                } else {
                    statValue = `\`${value}\``;
                }

                weaponStats.push(`${statName}: ${statValue}`);
            }

            const statsDisplay =
                weaponStats.length > 0
                    ? weaponStats.join("\n")
                    : "No additional stats.";

            const weaponType = equippedWeapon.type as WeaponType;
            const effectiveGroups = weaponAdvantages[weaponType] || [];

            const advantageDisplay =
                effectiveGroups.length > 0
                    ? effectiveGroups
                          .map((group: MonsterGroup) => `- **${group}**`)
                          .join("\n")
                    : "No advantages.";

            const embed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle(`${i.user.username}'s Equipped Weapon`)
                .setDescription(
                    `This weapon deals more damage to the following monster groups:\n${advantageDisplay}`,
                )
                .setThumbnail(equippedWeapon.imageURL)
                .addFields(
                    {
                        name: "Weapon Stats",
                        value: statsDisplay,
                        inline: false,
                    },
                    {
                        name: "Runes",
                        value: "You have no runes equipped on this weapon.",
                        inline: false,
                    },
                )
                .setFooter({ text: "Use /equip to change your equipment." })
                .setTimestamp();

            return r.edit({ embeds: [embed] });
        } catch (error) {
            console.error("Error executing /weapon command:", error);

            return r.edit(
                embedComment(
                    "An unexpected error occurred while processing your command. Please try again later.",
                ),
            );
        }
    },
});

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
