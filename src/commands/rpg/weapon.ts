import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
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
                const noProfileEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Profile Not Found")
                    .setDescription(
                        "You don't have a user profile yet. Please create one using `/profile`.",
                    )
                    .setTimestamp();

                return r.edit({ embeds: [noProfileEmbed] });
            }

            if (profile.locked) {
                const lockedProfileEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Profile Locked")
                    .setDescription(
                        "Your user profile is locked. You cannot use this command.",
                    )
                    .setTimestamp();

                return r.edit({ embeds: [lockedProfileEmbed] });
            }

            const stats = await syncStats(i.user.id);
            if (!stats) {
                const noStatsEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("No Stats Found")
                    .setDescription("No stats found for you.")
                    .setTimestamp();

                return r.edit({ embeds: [noStatsEmbed] });
            }

            if (!stats.equippedWeapon) {
                const noWeaponEmbed = new EmbedBuilder()
                    .setColor("Gold")
                    .setTitle(`${i.user.username}'s Equipped Weapon`)
                    .setDescription("You don't have any weapon equipped.")
                    .setThumbnail(i.user.displayAvatarURL())
                    .setFooter({
                        text: "Use `/equip` to change your equipment.",
                    })
                    .setTimestamp();

                return r.edit({ embeds: [noWeaponEmbed] });
            }

            const weaponName = stats.equippedWeapon as WeaponName;
            const equippedWeapon = weapons[weaponName];

            if (!equippedWeapon) {
                const weaponNotFoundEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Weapon Not Found")
                    .setDescription("Your equipped weapon could not be found.")
                    .setTimestamp();

                return r.edit({ embeds: [weaponNotFoundEmbed] });
            }

            const fullWeaponName = equippedWeapon.name;

            const weaponStats: string[] = [];
            for (const [key, value] of Object.entries(equippedWeapon)) {
                if (
                    [
                        "emoji",
                        "imageURL",
                        "sellPrice",
                        "chestChance",
                        "minWorldLevel",
                        "name",
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

            let description = `**${fullWeaponName}**\n\nThis weapon deals more damage to the following monster groups:\n${advantageDisplay}`;

            if (weaponType === "Catalyst") {
                description += `\nThis weapon can cast spells using </spell:1303910605257969695>. Spells are pre-casted and activate during combat in the same order they are casted.`;
            }

            const embed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle(`${i.user.username}'s Equipped Weapon`)
                .setDescription(description)
                .setThumbnail(equippedWeapon.imageURL)
                .addFields({
                    name: "Weapon Stats",
                    value: statsDisplay,
                    inline: false,
                });

            if (fullWeaponName && fullWeaponName.includes("Absolution")) {
                embed.addFields({
                    name: "Special Effect",
                    value: "Enemies can never land a Critical Attack on you.",
                    inline: false,
                });
            }

            return r.edit({ embeds: [embed] });
        } catch (error) {
            console.error("Error executing /weapon command:", error);

            const errorEmbed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Error")
                .setDescription(
                    "An unexpected error occurred while processing your command. Please try again later.",
                )
                .setTimestamp();

            return r.edit({ embeds: [errorEmbed] });
        }
    },
});

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
