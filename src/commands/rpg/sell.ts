import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, make, noop } from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import type { UserCharacter, UserStats } from "@prisma/client";
import { SlashCommandBuilder } from "discord.js";
import {
    addBalance,
    getUserCharacters,
    getUserStats,
    updateUserStats,
} from "../../services";
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
        const stats = (await getUserStats(i.user.id)) as UserStats | null;
        if (!stats || !is.array(stats.inventory)) {
            return i
                .respond([{ name: "No items found.", value: "n/a" }])
                .catch(noop);
        }

        const items = make.map<
            string,
            { id: string; name: string; amount: number; length: number }
        >();

        for (const c of stats.inventory) {
            const existing = items.get(c.id);
            if (!existing) {
                items.set(c.id, {
                    id: c.id,
                    name: c.item,
                    amount: c.amount,
                    length: c.metadata?.length || 0,
                });
            }
        }

        if (!items.size) {
            return i
                .respond([{ name: "No items found.", value: "n/a" }])
                .catch(noop);
        }

        const options = [...items.values()]
            .sort((a, b) => b.amount - a.amount)
            .map((c) => ({
                name: `${c.amount}x | ${c.name}${
                    c.length ? ` (${c.length} cm)` : ""
                }`,
                value: c.id,
            }));

        const focusedValue = i.options.getFocused()?.toLowerCase() || "";

        const filteredOptions = options.filter((option) =>
            option.name.toLowerCase().includes(focusedValue),
        );

        return i.respond(filteredOptions.slice(0, 25)).catch(noop);
    },
    async execute(i, r) {
        const id = i.options.getString("item", true);
        const amountToSell = i.options.getInteger("amount", true);

        if (amountToSell <= 0) {
            return r.edit(embedComment(`Invalid amount specified.`));
        }

        if (id === "n/a") {
            return r.edit(embedComment(`You didn't select a valid item.`));
        }

        const stats = (await getUserStats(i.user.id)) as UserStats | null;
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

        if (!is.array(stats.inventory)) {
            stats.inventory = [];
        }

        const item = stats.inventory.find((c) => c.id === id);

        if (!item) {
            return r.edit(
                embedComment(
                    `You don't have that item to sell.\n-# Check your inventory with </bag:1282456807100387411>`,
                ),
            );
        }

        const itemName = item.item;

        const characters = (await getUserCharacters(
            i.user.id,
        )) as UserCharacter[];

        const isEquippedOnCharacter = characters.some((character) => {
            if (
                weapons[itemName as WeaponName] &&
                character.equippedWeapon === itemName
            ) {
                return true;
            }
            if (artifacts[itemName as ArtifactName]) {
                return (
                    character.equippedFlower === itemName ||
                    character.equippedPlume === itemName ||
                    character.equippedSands === itemName ||
                    character.equippedGoblet === itemName ||
                    character.equippedCirclet === itemName
                );
            }
            return false;
        });

        if (isEquippedOnCharacter) {
            return r.edit(
                embedComment(
                    `You cannot sell "${itemName}" because it is currently equipped on one of your characters.`,
                ),
            );
        }

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
                Math.floor(item.metadata.length / 30) * 0.02;
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

        const updatedInventory = stats.inventory
            .map((c) => {
                if (c.id === id) {
                    return { ...c, amount: c.amount - amountToSell };
                }
                return c;
            })
            .filter((c) => c.amount > 0);

        await Promise.all([
            updateUserStats(i.user.id, {
                inventory: {
                    set: updatedInventory,
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
                }** for ${getAmount(totalSellPrice)}${rebirthBonusMessage}`,
                "Green",
            ),
        );
    },
});
