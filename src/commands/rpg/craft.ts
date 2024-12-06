import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, make, noop, snowflakes } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { drops, type DropName } from "../../utils/rpgitems/drops";

const upgradeChains = make.array<DropName[]>([
    ["Damaged Mask", "Stained Mask", "Ominous Mask"],
    ["Firm Arrowhead", "Sharp Arrowhead", "Weathered Arrowhead"],
    ["Slime Condensate", "Slime Secretions", "Slime Concentrate"],
    ["Divining Scroll", "Sealed Scroll", "Forbidden Curse Scroll"],
    ["Heavy Horn", "Black Bronze Horn", "Black Crystal Horn"],
    [
        "Treasure Hoarder Insignia",
        "Silver Raven Insignia",
        "Golden Raven Insignia",
    ],
    ["Dead Ley Line Branch", "Dead Ley Line Leaves", "Ley Line Sprout"],
    ["Mist Grass Pollen", "Mist Grass", "Mist Grass Wick"],
    [
        "Hunter's Sacrificial Knife",
        "Agent's Sacrificial Knife",
        "Inspector's Sacrificial Knife",
    ],
    ["Dismal Prism", "Crystal Prism", "Polarizing Prism"],
    ["Chaos Device", "Chaos Circuit", "Chaos Core"],
    ["Chaos Gear", "Chaos Axis", "Chaos Oculus"],
    ["A Flower Yet to Bloom", "Treasured Flower", "Wanderer's Blooming Flower"],
    ["Faded Red Satin", "Trimmed Red Silk", "Rich Red Brocade"],
    ["Old Handguard", "Kageuchi Handguard", "Famed Handguard"],
]);

export const craft = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`craft`)
        .setDescription(`[RPG] Craft items by upgrading your resources.`)
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The item you want to craft")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The number of items to craft")
                .setRequired(true)
                .setMinValue(1),
        ),
    async autocomplete(i) {
        const craftableItems = upgradeChains.flatMap((chain) => {
            return chain.slice(1).map((itemName) => {
                const item = drops[itemName];
                const rarity = item.rarity || "?";
                const index = chain.indexOf(itemName);
                const sourceItemName = chain[index - 1];
                const sourceRarity = drops[sourceItemName]?.rarity || "?";
                return {
                    name: `[${sourceRarity}] ${sourceItemName} -> [${rarity}] ${itemName}`,
                    value: itemName,
                };
            });
        });

        const item = i.options.getString("item", false) ?? "";
        if (!item) {
            return i.respond(craftableItems.slice(0, 25)).catch(noop);
        }
        const choices = craftableItems.filter((c) =>
            c.name.toLowerCase().includes(item.toLowerCase()),
        );
        if (!choices.length) {
            return i
                .respond([{ name: "No match found for that.", value: "n/a" }])
                .catch(noop);
        }
        return i.respond(choices.slice(0, 25)).catch(noop);
    },

    defer: { silent: false },
    async execute(i, r) {
        const craftOption = i.options.getString("item", true);
        const amountToCraft = i.options.getInteger("amount", true);

        if (craftOption === "n/a") {
            return r.edit(embedComment(`You didn't select a valid option.`));
        }

        const targetItem = drops[craftOption as DropName];
        if (!targetItem) {
            return r.edit(
                embedComment(`The item "${craftOption}" doesn't exist.`),
            );
        }

        const chain = upgradeChains.find((chain) =>
            chain.includes(craftOption as DropName),
        );
        if (!chain) {
            return r.edit(embedComment(`"${craftOption}" cannot be crafted.`));
        }

        const index = chain.indexOf(craftOption as DropName);
        if (index <= 0) {
            return r.edit(embedComment(`"${craftOption}" cannot be crafted.`));
        }

        const sourceItemName = chain[index - 1];

        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        if (stats.isHunting) {
            return r.edit(embedComment("You cannot craft while hunting!"));
        }

        const requiredAmount = 3 * amountToCraft;

        const itemToCraft = stats.inventory.find(
            (item) => item.item === sourceItemName,
        );

        if (!itemToCraft || itemToCraft.amount < requiredAmount) {
            return r.edit(
                embedComment(
                    `You don't have enough **${sourceItemName}** to craft **${craftOption}**.\n-# You need \`${requiredAmount}x\` ${sourceItemName}.`,
                ),
            );
        }

        itemToCraft.amount -= requiredAmount;
        if (itemToCraft.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (item) => item.item !== itemToCraft.item,
            );
        }

        const existingTargetItem = stats.inventory.find(
            (item) => item.item === craftOption,
        );

        if (existingTargetItem) {
            existingTargetItem.amount += amountToCraft;
        } else {
            stats.inventory.push({
                id: snowflakes.generate(),
                item: craftOption,
                amount: amountToCraft,
                metadata: null,
            });
        }

        await updateUserStats(i.user.id, {
            inventory: { set: stats.inventory },
        });

        return r.edit(
            embedComment(
                `You successfully crafted \`${amountToCraft}x\` **${craftOption}** using \`${requiredAmount}x\` **${sourceItemName}**!`,
                "Green",
            ),
        );
    },
});
