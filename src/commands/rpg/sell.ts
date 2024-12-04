import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, noop } from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { addBalance, getUserStats, updateUserStats } from "../../services";
import { getAmount } from "../../utils";
import { artifacts, type ArtifactName } from "../../utils/rpgitems/artifacts";
import { drops, type DropName } from "../../utils/rpgitems/drops";
import { fish, type FishName } from "../../utils/rpgitems/fish";
import { misc, type MiscName } from "../../utils/rpgitems/misc";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const sell = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("sell")
        .setDescription("[RPG] Sell an item or weapon from your inventory.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The item that you want to sell")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The amount to sell")
                .setRequired(true)
                .setMinValue(1),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return i
                .respond([{ name: "No items found.", value: "n/a" }])
                .catch(noop);
        }

        const inventoryItems = stats.inventory;

        const options = inventoryItems.map((invItem, index) => {
            let displayName = invItem.item;
            if (invItem.metadata?.length) {
                displayName += ` (${invItem.metadata.length} cm)`;
            }
            return {
                name: displayName,
                value: String(index),
            };
        });

        const focusedValue = i.options.getFocused()?.toLowerCase() || "";

        const filteredOptions = options.filter((option) =>
            option.name.toLowerCase().includes(focusedValue),
        );

        return i.respond(filteredOptions.slice(0, 25)).catch(noop);
    },
    async execute(i, r) {
        const itemIndexStr = i.options.getString("item", true);
        const amountToSell = i.options.getInteger("amount", true);

        if (amountToSell <= 0) {
            return r.edit(embedComment(`Something went wrong...`));
        }

        if (itemIndexStr === "n/a") {
            return r.edit(embedComment(`You didn't select a valid item.`));
        }

        const itemIndex = parseInt(itemIndexStr, 10);
        if (isNaN(itemIndex)) {
            return r.edit(embedComment(`Invalid item selection.`));
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
            return r.edit(embedComment("You cannot sell while hunting!"));
        }

        const inventoryItems = stats.inventory || [];

        const item = inventoryItems[itemIndex];
        if (!item) {
            return r.edit(
                embedComment(
                    `You don't have that item to sell.\n-# Check your inventory with </bag:1282456807100387411>`,
                ),
            );
        }

        const itemName = item.item;

        if (
            weapons[itemName as WeaponName] &&
            stats.equippedWeapon === itemName
        ) {
            return r.edit(
                embedComment(
                    `You cannot sell "${itemName}" because it is currently equipped!`,
                ),
            );
        }

        if (
            artifacts[itemName as ArtifactName] &&
            (stats.equippedFlower === itemName ||
                stats.equippedPlume === itemName ||
                stats.equippedSands === itemName ||
                stats.equippedGoblet === itemName ||
                stats.equippedCirclet === itemName)
        ) {
            return r.edit(
                embedComment(
                    `You cannot sell "${itemName}" because it is currently equipped!`,
                ),
            );
        }

        if (item.amount < amountToSell) {
            return r.edit(
                embedComment(
                    `You don't have enough of "${itemName}" to sell.\n-# Check your inventory with </bag:1282456807100387411>`,
                ),
            );
        }

        const itemData =
            drops[itemName as DropName] ||
            weapons[itemName as WeaponName] ||
            artifacts[itemName as ArtifactName] ||
            misc[itemName as MiscName] ||
            fish[itemName as FishName];

        if (!itemData) {
            return r.edit(
                embedComment(
                    `The item "${itemName}" doesn't exist. Make sure you typed it correctly.`,
                ),
            );
        }

        let baseSellPrice: number;
        if (is.number(itemData.sellPrice)) {
            baseSellPrice = itemData.sellPrice;
        } else {
            return r.edit(
                embedComment(`The item "${itemName}" cannot be sold.`),
            );
        }

        if (item.metadata?.length && fish[itemName as FishName]) {
            const lengthMultiplier =
                Math.floor(item.metadata.length / 30) * 0.05;
            baseSellPrice = Math.round(baseSellPrice * (1 + lengthMultiplier));
        }

        const rebirthMultiplier =
            1 +
            Math.min(stats.rebirths, 3) * 0.2 +
            Math.max(0, stats.rebirths - 3) * 0.1;
        const rebirthBonus =
            (rebirthMultiplier - 1) * baseSellPrice * amountToSell;

        let totalSellPrice = baseSellPrice * amountToSell * rebirthMultiplier;

        totalSellPrice = Math.round(totalSellPrice);

        item.amount -= amountToSell;
        if (item.amount <= 0) {
            inventoryItems.splice(itemIndex, 1);
        }

        await Promise.all([
            updateUserStats(i.user.id, {
                inventory: {
                    set: inventoryItems,
                },
            }),
            addBalance(
                i.user.id,
                totalSellPrice,
                true,
                `Sold ${amountToSell}x ${itemName}${
                    item.metadata?.length ? ` (${item.metadata.length} cm)` : ""
                }`,
            ),
        ]);

        const rebirthBonusMessage =
            stats.rebirths > 0
                ? `\n-# (+${Math.round(rebirthBonus)} ${texts.c.u} from ${
                      stats.rebirths
                  } Rebirth${stats.rebirths > 1 ? "s" : ""})`
                : "";

        return r.edit(
            embedComment(
                `You sold \`${amountToSell}x\` **${itemName}${
                    item.metadata?.length ? ` (${item.metadata.length} cm)` : ""
                }** for ${getAmount(totalSellPrice)} ${rebirthBonusMessage}`,
                "Green",
            ),
        );
    },
});
