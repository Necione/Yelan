import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys, is, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { type DropName } from "../../utils/rpgitems/drops";

const craftingMap: Record<string, { source: DropName; target: DropName }> = {
    FirmArrowhead: {
        source: "Firm Arrowhead",
        target: "Sharp Arrowhead",
    },
    SharpArrowhead: {
        source: "Sharp Arrowhead",
        target: "Weathered Arrowhead",
    },

    HeavyHorn: {
        source: "Heavy Horn",
        target: "Black Bronze Horn",
    },
    BlackBronzeHorn: {
        source: "Black Bronze Horn",
        target: "Black Crystal Horn",
    },

    DiviningScroll: {
        source: "Divining Scroll",
        target: "Sealed Scroll",
    },
    SealedScroll: {
        source: "Sealed Scroll",
        target: "Forbidden Curse Scroll",
    },

    SlimeCondensate: {
        source: "Slime Condensate",
        target: "Slime Secretions",
    },
    SlimeSecretions: {
        source: "Slime Secretions",
        target: "Slime Concentrate",
    },
    DamagedMask: {
        source: "Damaged Mask",
        target: "Stained Mask",
    },
    StainedMask: {
        source: "Stained Mask",
        target: "Ominous Mask",
    },
    TreasureHoarderInsignia: {
        source: "Treasure Hoarder Insignia",
        target: "Silver Raven Insignia",
    },
    SilverRavenInsignia: {
        source: "Silver Raven Insignia",
        target: "Golden Raven Insignia",
    },
    DeadLeyLineBranch: {
        source: "Dead Ley Line Branch",
        target: "Dead Ley Line Leaves",
    },
    DeadLeyLineLeaves: {
        source: "Dead Ley Line Leaves",
        target: "Ley Line Sprout",
    },
    MistGrass: {
        source: "Mist Grass Pollen",
        target: "Mist Grass",
    },
    AgentsSacrificalKnife: {
        source: "Hunter's Sacrificial Knife",
        target: "Agent's Sacrificial Knife",
    },
};

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
                .setRequired(true),
        ),
    async autocomplete(i) {
        let choices = getKeys(craftingMap).map((c) => ({
            name: `${craftingMap[c]?.source || "???"} -> ${
                craftingMap[c]?.target || "????"
            }`,
            value: c,
        }));
        const item = i.options.getString("item", false) ?? "";
        if (!item) {
            return i.respond(choices).catch(noop);
        }
        choices = choices.filter((c) =>
            c.value.toLowerCase().includes(item.toLowerCase()),
        );
        if (!is.array(choices)) {
            return i
                .respond([{ name: "No matches for that", value: "n/a" }])
                .catch(noop);
        }
        return i.respond(choices).catch(noop);
    },
    defer: { silent: false },
    async execute(i, r) {
        const craftOption = i.options.getString("item", true);
        const amountToCraft = i.options.getInteger("amount", true);

        if (craftOption === "n/a") {
            return r.edit(embedComment(`You didn't select a valid option.`));
        }

        const craftingRecipe = craftingMap[craftOption];
        if (!craftingRecipe) {
            return r.edit(
                embedComment(`Unable to find "${craftOption}" crafting recipe`),
            );
        }
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

        const itemToCraft = stats.inventory.find(
            (item) => item.item === craftingRecipe.source,
        );

        if (!itemToCraft || itemToCraft.amount < 3 * amountToCraft) {
            return r.edit(
                embedComment(
                    `You don't have enough **${
                        craftingRecipe.source
                    }** to craft **${craftingRecipe.target}**.\n-# You need \`${
                        3 * amountToCraft
                    }x\` ${craftingRecipe.source}.`,
                ),
            );
        }

        itemToCraft.amount -= 3 * amountToCraft;
        if (itemToCraft.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (item) => item.item !== itemToCraft.item,
            );
        }

        const existingTargetItem = stats.inventory.find(
            (item) => item.item === craftingRecipe.target,
        );

        if (existingTargetItem) {
            existingTargetItem.amount += amountToCraft;
        } else {
            stats.inventory.push({
                item: craftingRecipe.target,
                amount: amountToCraft,
            });
        }

        await updateUserStats(i.user.id, {
            inventory: { set: stats.inventory },
        });

        return r.edit(
            embedComment(
                `You successfully crafted \`${amountToCraft}x\` **${
                    craftingRecipe.target
                }** using \`${3 * amountToCraft}x\` **${
                    craftingRecipe.source
                }**!`,
                "Green",
            ),
        );
    },
});
