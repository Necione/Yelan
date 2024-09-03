import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";
import { syncStats } from "../../services/userStats";
import { cooldowns } from "../../utils";

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
            return r.edit(
                embedComment(
                    `No stats found for you :(`,
                ),
            );
        }

        const items = stats.inventory || [];
        const cc = cooldowns.get(p, "hunt");

        const expRequired = 20 * Math.pow(1.2, stats.worldLevel - 1);

        const embed = new EmbedBuilder()
            .setColor("Aqua")
            .setTitle(`${i.user.username}'s RPG Stats`)
            .setThumbnail(i.user.displayAvatarURL())
            .setDescription(cc.status ? "Ready to hunt!" : cc.message)
            .addFields(
                {
                    name: "Your Stats",
                    value: `🌍 World Level: \`${stats.worldLevel}\` | ⭐ EXP: \`${
                        stats.exp
                    }/${expRequired.toFixed(0)}\`\n❤️ HP: \`${
                        stats.hp
                    }/${stats.maxHP}\`\n⚔️ ATK: \`${stats.attackPower.toFixed(2)} (+${(stats.attackPower - stats.baseAttack).toFixed(2)})\``,
                    inline: false,
                },
                {
                    name: "Inventory",
                    value: items.length
                        ? items
                              .map((i) => `\`${i.amount}x\` ${i.item}`)
                              .join("\n")
                        : "Your inventory is empty.",
                    inline: false,
                },
            );

        if (stats.equippedWeapon) {
            embed.addFields({
                name: "Equipped Weapon",
                value: `${stats.equippedWeapon} (ATK: ${(stats.attackPower - stats.baseAttack).toFixed(2)})`,
                inline: false,
            });
        }

        await r.edit({ embeds: [embed] });
    },
});
