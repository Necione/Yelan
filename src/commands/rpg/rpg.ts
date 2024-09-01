import type { SlashCommand } from "@elara-services/botbuilder";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, getUserStats } from "../../services";
import { cooldowns } from "../../utils";

export const rpg: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("rpg")
        .setDescription("[RPG] Displays your current RPG stats.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(interaction, responder) {
        if (!interaction.deferred) {
            return;
        }

        const stats = await getUserStats(interaction.user.id);
        if (!stats) {
            return responder.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("No Stats Found")
                        .setDescription(
                            "You do not have any stats yet. Try using the /hunt command to get started.",
                        ),
                ],
            });
        }

        const userWallet = await getProfileByUserId(interaction.user.id);
        if (!userWallet) {
            return responder.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("No Profile Found")
                        .setDescription(
                            "You do not have a profile yet. Please set up your profile.",
                        ),
                ],
            });
        }

        const inventoryItems = stats.inventory as {
            item: string;
            amount: number;
        }[];
        const inventoryDescription =
            inventoryItems.length > 0
                ? inventoryItems.map((i) => `${i.amount}x ${i.item}`).join("\n")
                : "Your inventory is empty.";

        const hpEmoji = "❤️";
        const attackEmoji = "⚔️";
        const statsDescription = `${hpEmoji} HP: \`${stats.hp}\`\n${attackEmoji} ATK: \`${stats.attackPower.toFixed(2)}\``;

        const cooldownCheck = cooldowns.get(userWallet, "hunt");
        let cooldownDescription = "Ready to hunt!";

        if (!cooldownCheck.status) {
            cooldownDescription = cooldownCheck.message;
        }

        const embed = new EmbedBuilder()
            .setColor("Aqua")
            .setTitle(`${interaction.user.username}'s RPG Stats`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setDescription(cooldownDescription)
            .addFields(
                { name: "Your Stats", value: statsDescription, inline: false },
                {
                    name: "Inventory",
                    value: inventoryDescription,
                    inline: false,
                },
            );

        await responder.edit({ embeds: [embed] });
    },
};
