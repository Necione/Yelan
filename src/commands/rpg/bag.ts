import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { chunk, embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";
import { syncStats } from "../../services/userStats";
import { getPaginatedMessage } from "../../utils";
import {
    type ArtifactName,
    artifacts,
    type ArtifactType,
    getArtifactType,
} from "../../utils/rpgitems/artifacts";
import { drops } from "../../utils/rpgitems/drops";
import { food } from "../../utils/rpgitems/food";
import { misc } from "../../utils/rpgitems/misc";
import { weapons } from "../../utils/rpgitems/weapons";

const artifactTypeEmojis: { [key in ArtifactType]: string } = {
    Flower: "🌸",
    Plume: "🪶",
    Sands: "⏳",
    Goblet: "🍷",
    Circlet: "👑",
};

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
                    { name: "All", value: "All" },
                    { name: "Drops", value: "Drops" },
                    { name: "Weapons", value: "Weapons" },
                    { name: "Artifacts", value: "Artifacts" },
                    { name: "Misc", value: "Misc" },
                    { name: "Food", value: "Food" },
                ),
        )
        .addStringOption((option) =>
            option
                .setName("sort")
                .setDescription("How to sort the items.")
                .setRequired(false)
                .addChoices(
                    { name: "Alphabetical", value: "Alphabetical" },
                    { name: "Quantity", value: "Quantity" },
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
        const sortOption = i.options.getString("sort") || "Alphabetical";

        let filteredItems = items;

        switch (category) {
            case "Drops":
                filteredItems = items.filter((item) => item.item in drops);
                break;
            case "Weapons":
                filteredItems = items.filter((item) => item.item in weapons);
                break;
            case "Artifacts":
                filteredItems = items.filter((item) => item.item in artifacts);
                break;
            case "Misc":
                filteredItems = items.filter((item) => item.item in misc);
                break;
            case "Food":
                filteredItems = items.filter((item) => item.item in food);
                break;
            case "All":
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

        if (sortOption === "Alphabetical") {
            filteredItems.sort((a, b) => a.item.localeCompare(b.item));
        } else if (sortOption === "Quantity") {
            filteredItems.sort((a, b) => b.amount - a.amount);
        }

        const chunks = chunk(filteredItems, 10);
        const pager = getPaginatedMessage();
        const embedColor = stats.abyssMode ? "#b84df1" : "Aqua";

        for (const c of chunks) {
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(
                    `${i.user.username}'s Inventory - ${category} (${sortOption})`,
                )
                .setDescription(
                    c
                        .map((item) => {
                            let displayItem = `\`${item.amount}x\` ${item.item}`;
                            if (item.item in artifacts) {
                                const artifactType = getArtifactType(
                                    item.item as ArtifactName,
                                );
                                if (artifactType) {
                                    const emoji =
                                        artifactTypeEmojis[artifactType];
                                    if (emoji) {
                                        displayItem += ` (${emoji})`;
                                    }
                                }
                            }
                            return displayItem;
                        })
                        .join("\n"),
                );
            pager.pages.push({ embeds: [embed] });
        }

        return pager.run(i, i.user).catch((error) => {
            console.error("Error running pager:", error);
            r.edit(
                embedComment("An error occurred while displaying your bag."),
            );
        });
    },
});
