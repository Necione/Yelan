import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { chunk, embedComment, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";
import { syncStats } from "../../services/userStats";
import { getPaginatedMessage } from "../../utils";

export const bag = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("bag")
        .setDescription("[RPG] Displays your inventory with pagination.")
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
                    `You don't have a user profile yet, please use \`/profile\`.`,
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

        if (items.length === 0) {
            return r.edit(embedComment("Your inventory is empty."));
        }

        const allItems = items;

        const chunks = chunk(allItems, 10);
        const pager = getPaginatedMessage();

        for (const c of chunks) {
            const embed = new EmbedBuilder()
                .setColor("Aqua")
                .setTitle(`${i.user.username}'s Inventory`)
                .setDescription(
                    c
                        .map((item) => `\`${item.amount}x\` ${item.item}`)
                        .join("\n"),
                );
            pager.pages.push({ embeds: [embed] });
        }

        return pager.run(i, i.user).catch(noop);
    },
});
