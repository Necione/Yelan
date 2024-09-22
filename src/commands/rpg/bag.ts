import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { chunk, embedComment, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";
import { syncStats } from "../../services/userStats";
import { getPaginatedMessage } from "../../utils";
import { artifacts } from "../../utils/rpgitems/artifacts";
import { drops } from "../../utils/rpgitems/drops";
import { food } from "../../utils/rpgitems/food";
import { misc } from "../../utils/rpgitems/misc";
import { weapons } from "../../utils/rpgitems/weapons";

export const bag = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("bag")
        .setDescription("[RPG] Displays your inventory with pagination.")
        .addStringOption((option) =>
            option
                .setName("category")
                .setDescription("The type of items to show.")
                .setRequired(true)
                .addChoices(
                    { name: "All", value: "all" },
                    { name: "Drops", value: "drops" },
                    { name: "Weapons", value: "weapons" },
                    { name: "Artifacts", value: "artifacts" },
                    { name: "Misc", value: "misc" },
                    { name: "Food", value: "food" },
                ),
        )
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

        const category = i.options.getString("category");

        let filteredItems = items;

        switch (category) {
            case "drops":
                filteredItems = items.filter((item) => item.item in drops);
                break;
            case "weapons":
                filteredItems = items.filter((item) => item.item in weapons);
                break;
            case "artifacts":
                filteredItems = items.filter((item) => item.item in artifacts);
                break;
            case "misc":
                filteredItems = items.filter((item) => item.item in misc);
                break;
            case "food":
                filteredItems = items.filter((item) => item.item in food);
                break;
            case "all":
            default:
                filteredItems = items;
                break;
        }

        if (filteredItems.length === 0) {
            return r.edit(
                embedComment(
                    `No items found for the selected category: ${category}.`,
                ),
            );
        }

        const chunks = chunk(filteredItems, 10);
        const pager = getPaginatedMessage();

        for (const c of chunks) {
            const embed = new EmbedBuilder()
                .setColor("Aqua")
                .setTitle(`${i.user.username}'s Inventory - ${category}`)
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
