import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";
import { syncStats } from "../../services/userStats";
import { cooldowns } from "../../utils";
import { formatChange } from "../../utils/hunt";

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

        const items = stats.inventory || [];
        const cc = cooldowns.get(p, "hunt");

        const filteredInventory = items.filter(
            (item) =>
                item.item !== stats.equippedWeapon &&
                item.item !== stats.equippedFlower &&
                item.item !== stats.equippedPlume &&
                item.item !== stats.equippedSands &&
                item.item !== stats.equippedGoblet &&
                item.item !== stats.equippedCirclet,
        );

        const expRequired = 20 * Math.pow(1.2, stats.worldLevel - 1);

        const embed = new EmbedBuilder()
            .setColor("Aqua")
            .setTitle(`${i.user.username}'s RPG Stats`)
            .setThumbnail(i.user.displayAvatarURL())
            .setDescription(cc.status ? "Ready to hunt!" : cc.message)
            .addFields(
                {
                    name: "Your Stats",
                    value: `🌍 World Level: \`${
                        stats.worldLevel
                    }\` | ⭐ EXP: \`${stats.exp}/${expRequired.toFixed(
                        0,
                    )}\`\n❤️ HP: \`${stats.hp}/${
                        stats.maxHP
                    }\`\n⚔️ ATK: \`${stats.attackPower.toFixed(
                        2,
                    )} (${formatChange(
                        stats.attackPower - stats.baseAttack,
                    )})\`${
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
                              }%\` | 🛡️ DEF Value: \`${stats.defValue.toFixed(
                                  2,
                              )}\``
                            : ""
                    }`,
                    inline: false,
                },
                {
                    name: "Inventory",
                    value: filteredInventory.length
                        ? filteredInventory
                              .map((i) => `\`${i.amount}x\` ${i.item}`)
                              .join("\n")
                        : "Your inventory is empty.",
                    inline: false,
                },
            );

        if (stats.equippedWeapon) {
            embed.addFields({
                name: "Equipped Weapon",
                value: `${stats.equippedWeapon} (ATK: ${formatChange(
                    stats.attackPower - stats.baseAttack,
                )})`,
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

        await r.edit({ embeds: [embed] });
    },
});
