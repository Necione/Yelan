import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { type DropName } from "../../utils/rpgitems/drops";

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
                .addChoices(
                    {
                        name: "Firm Arrowhead -> Sharp Arrowhead",
                        value: "FirmArrowhead",
                    },
                    {
                        name: "Sharp Arrowhead -> Weathered Arrowhead",
                        value: "SharpArrowhead",
                    },

                    {
                        name: "Heavy Horn -> Black Bronze Horn",
                        value: "HeavyHorn",
                    },
                    {
                        name: "Black Bronze Horn -> Black Crystal Horn",
                        value: "BlackBronzeHorn",
                    },

                    {
                        name: "Divining Scroll -> Sealed Scroll",
                        value: "DiviningScroll",
                    },
                    {
                        name: "Sealed Scroll -> Forbidden Curse Scroll",
                        value: "SealedScroll",
                    },

                    {
                        name: "Slime Condensate -> Slime Secretions",
                        value: "SlimeCondensate",
                    },
                    {
                        name: "Slime Secretions -> Slime Concentrate",
                        value: "SlimeSecretions",
                    },
                    {
                        name: "Damaged Mask -> Stained Mask",
                        value: "DamagedMask",
                    },
                    {
                        name: "Stained Mask -> Ominous Mask",
                        value: "StainedMask",
                    },
                ),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The number of items to craft")
                .setRequired(true),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const craftOption = i.options.getString("item", true);
        const amountToCraft = i.options.getInteger("amount", true);

        const craftingMap: Record<
            string,
            { source: DropName; target: DropName }
        > = {
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
        };

        const craftingRecipe = craftingMap[craftOption];
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
