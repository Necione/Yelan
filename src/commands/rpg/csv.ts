import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getUserStats } from "../../services";
import { getAmount } from "../../utils";
import { artifacts, type ArtifactName } from "../../utils/rpgitems/artifacts";
import { drops, type DropName } from "../../utils/rpgitems/drops";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const csv = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("csv")
        .setDescription("[RPG] Check the rebirth sell value of a user.")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to check the rebirth sell value for.")
                .setRequired(true),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const targetUser = i.options.getUser("user");
        if (!targetUser) {
            return r.edit(embedComment("User not found.", "Red"));
        }

        const stats = await getUserStats(targetUser.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for ${targetUser.username}.`,
                    "Red",
                ),
            );
        }

        let totalSellPrice = 0;
        const rebirthMultiplier =
            1 +
            Math.min(stats.rebirths, 3) * 0.2 +
            Math.max(0, stats.rebirths - 3) * 0.1;

        for (const item of stats.inventory) {
            const itemData =
                drops[item.item as DropName] ||
                weapons[item.item as WeaponName] ||
                artifacts[item.item as ArtifactName];

            if (itemData) {
                const baseSellPrice = itemData.sellPrice * item.amount;
                const itemSellPrice = baseSellPrice * rebirthMultiplier;

                totalSellPrice += Math.round(itemSellPrice);
            }
        }

        const resultEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`${targetUser.username}'s Rebirth Sell Value`)
            .setDescription(
                `If ${
                    targetUser.username
                } were to rebirth, all items could be sold for ${getAmount(
                    totalSellPrice,
                )}`,
            );

        return r.edit({
            embeds: [resultEmbed],
        });
    },
});
