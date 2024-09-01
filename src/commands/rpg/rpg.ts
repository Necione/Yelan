import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, getUserStats } from "../../services";
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
        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    `You don't have any stats yet, try using \`/hunt\` command to get started!`,
                ),
            );
        }
        const items = stats.inventory || [];
        const cc = cooldowns.get(p, "hunt");

        const embed = new EmbedBuilder()
            .setColor("Aqua")
            .setTitle(`${i.user.username}'s RPG Stats`)
            .setThumbnail(i.user.displayAvatarURL())
            .setDescription(cc.status ? "Ready to hunt!" : cc.message)
            .addFields(
                {
                    name: "Your Stats",
                    value: `❤️ HP: \`${
                        stats.hp
                    }\`\n⚔️ ATK: \`${stats.attackPower.toFixed(2)}\``,
                    inline: false,
                },
                {
                    name: "Inventory",
                    value: items.length
                        ? items.map((i) => `${i.amount}x ${i.item}`).join("\n")
                        : "Your inventory is empty.",
                    inline: false,
                },
            );

        await r.edit({ embeds: [embed] });
    },
});
