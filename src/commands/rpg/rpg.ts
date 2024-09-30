import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";
import { syncStats } from "../../services/userStats";
import { cooldowns } from "../../utils";
import { formatChange } from "../../utils/hunt";
import { type WeaponName, weapons } from "../../utils/rpgitems/weapons";

export const rpg = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("rpg")
        .setDescription("[RPG] Displays your current RPG stats.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.deferred) {
            return;
        }
        const p = await getProfileByUserId(i.user.id);
        if (!p) {
            return r.edit(
                embedComment(
                    `You don't have a user profile yet, please use \`/profile\``,
                ),
            );
        }
        if (p.locked) {
            return r.edit(
                embedComment(
                    `Your user profile is locked, you can't use this command.`,
                ),
            );
        }

        const stats = await syncStats(i.user.id);

        if (!stats) {
            return r.edit(embedComment(`No stats found for you :(`));
        }

        const adventureCooldown = cooldowns.get(p, "adventure");

        const expRequired = 20 * Math.pow(1.2, stats.worldLevel - 1);

        const hpDisplay =
            stats.hp > stats.maxHP
                ? `💜 \`${stats.hp}/${stats.maxHP}\` **OVERHEALED**`
                : stats.hp < stats.maxHP * 0.3
                  ? `🧡 \`${stats.hp}/${stats.maxHP}\` **LOW HP**`
                  : `❤️ \`${stats.hp}/${stats.maxHP}\``;

        const embed = new EmbedBuilder()
            .setColor("Aqua")
            .setTitle(`${i.user.username}'s RPG Stats`)
            .setDescription(
                `Use the </bag:1282456807100387411> command to see your inventory`,
            )
            .setThumbnail(i.user.displayAvatarURL())
            .addFields({
                name: "Your Stats",
                value: `🌍 World Level: \`${
                    stats.worldLevel
                }\` | <:Item_Adventure_EXP:1287247325135114356> EXP: \`${
                    stats.exp
                }/${expRequired.toFixed(
                    0,
                )}\`\n<:Achievement_Domains_and_Spiral_A:1287247461399662622> Abyss Floor: \`${
                    stats.abyssFloor
                }\`\n\n${hpDisplay}\n⚔️ ATK: \`${stats.attackPower.toFixed(
                    2,
                )} (${formatChange(stats.attackPower - stats.baseAttack)})\`${
                    stats.critChance > 0 || stats.critValue > 0
                        ? `\n🎯 Crit Chance: \`${
                              stats.critChance
                          }%\` | 💥 Crit Value: \`${stats.critValue.toFixed(
                              2,
                          )}x\``
                        : ""
                }${
                    stats.defChance > 0 || stats.defValue > 0
                        ? `\n🛡️ DEF Chance: \`${
                              stats.defChance
                          }%\` | 🛡️ DEF Value: \`${stats.defValue.toFixed(2)}\``
                        : ""
                }`,
                inline: false,
            });
        if (stats.rebirths > 0) {
            embed.setFooter({
                text: getRebirthString(stats.rebirths),
            });
        }

        if (stats.equippedWeapon) {
            const equippedWeapon = weapons[stats.equippedWeapon as WeaponName];
            const weaponBonusAttack = equippedWeapon.attackPower;

            embed.addFields({
                name: "Equipped Weapon",
                value: `${equippedWeapon.emoji} ${
                    stats.equippedWeapon
                } (${formatChange(weaponBonusAttack)} ATK)`,
                inline: false,
            });
        }

        const equippedArtifacts: string[] = [];

        if (stats.equippedFlower) {
            equippedArtifacts.push(`🌸 Flower: **${stats.equippedFlower}**`);
        }
        if (stats.equippedPlume) {
            equippedArtifacts.push(`🪶 Plume: **${stats.equippedPlume}**`);
        }
        if (stats.equippedSands) {
            equippedArtifacts.push(`⏳ Sands: **${stats.equippedSands}**`);
        }
        if (stats.equippedGoblet) {
            equippedArtifacts.push(`🍷 Goblet: **${stats.equippedGoblet}**`);
        }
        if (stats.equippedCirclet) {
            equippedArtifacts.push(`👑 Circlet: **${stats.equippedCirclet}**`);
        }

        if (equippedArtifacts.length > 0) {
            embed.addFields({
                name: "Equipped Artifacts",
                value: equippedArtifacts.join("\n"),
                inline: false,
            });
        }

        embed.addFields({
            name: "Cooldowns",
            value: `Hunt: ${
                adventureCooldown.status ? "Ready" : adventureCooldown.message
            }`,
            inline: false,
        });

        await r.edit({ embeds: [embed] });
    },
});

function getRebirthString(rebirths: number): string {
    const rebirthNames = [
        "☀️ FIRST REBIRTH",
        "🌑 SECOND REBIRTH",
        "🌕 THIRD REBIRTH",
        "🌟 FOURTH REBIRTH",
        "🌌 FIFTH REBIRTH",
        "🌠 SIXTH REBIRTH",
        "🌍 SEVENTH REBIRTH",
        "🌙 EIGHTH REBIRTH",
        "🚀 NINTH REBIRTH",
        "🛰️ TENTH REBIRTH",
    ];

    if (rebirths > 0 && rebirths <= 10) {
        return rebirthNames[rebirths - 1];
    } else if (rebirths > 10) {
        return `✨ ${rebirths} REBIRTHS`;
    } else {
        return "";
    }
}
