import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys, is, noop } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { skills } from "../../plugins/other/utils";
import { addBalance, getUserStats, updateUserStats } from "../../services";
import { artifacts, type ArtifactName } from "../../utils/rpgitems/artifacts";
import { drops, type DropName } from "../../utils/rpgitems/drops";
import { misc, type MiscName } from "../../utils/rpgitems/misc";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const sellall = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("sellall")
        .setDescription(
            "[RPG] Sell all quantities of specified items from your inventory.",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("item1")
                .setDescription("The first item to sell all of")
                .setRequired(false)
                .setAutocomplete(true),
        )
        .addStringOption((option) =>
            option
                .setName("item2")
                .setDescription("The second item to sell all of")
                .setRequired(false)
                .setAutocomplete(true),
        )
        .addStringOption((option) =>
            option
                .setName("item3")
                .setDescription("The third item to sell all of")
                .setRequired(false)
                .setAutocomplete(true),
        )
        .addStringOption((option) =>
            option
                .setName("item4")
                .setDescription("The fourth item to sell all of")
                .setRequired(false)
                .setAutocomplete(true),
        )
        .addStringOption((option) =>
            option
                .setName("item5")
                .setDescription("The fifth item to sell all of")
                .setRequired(false)
                .setAutocomplete(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const list = [
            ...getKeys(drops),
            ...getKeys(weapons),
            ...getKeys(artifacts),
            ...getKeys(misc),
        ].map((c) => ({ name: String(c), value: c }));
        const focusedOption = i.options.getFocused(true);
        const item = focusedOption.value;
        if (!item) {
            return i.respond(list.slice(0, 25)).catch(noop);
        }
        const items = list.filter((c) =>
            c.name.toLowerCase().includes(item.toLowerCase()),
        );
        if (!is.array(items)) {
            return i
                .respond([{ name: "No match found for that.", value: "n/a" }])
                .catch(noop);
        }
        return i.respond(items.slice(0, 25)).catch(noop);
    },
    async execute(i, r) {
        const itemNames = [];
        for (let idx = 1; idx <= 5; idx++) {
            const itemName = i.options.getString(`item${idx}`, false);
            if (itemName && itemName !== "n/a") {
                itemNames.push(itemName);
            }
        }

        if (itemNames.length === 0) {
            return r.edit(
                embedComment(`You didn't select any valid items to sell.`),
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
            return r.edit(embedComment("You cannot sell while hunting!"));
        }

        let totalSellPrice = 0;
        const messages = [];
        const rebirthMultiplier =
            1 +
            Math.min(stats.rebirths, 3) * 0.2 +
            Math.max(0, stats.rebirths - 3) * 0.1;
        let totalRebirthBonus = 0;
        let totalAppraiseBonus = 0;
        const itemsSold = [];

        const hasAppraiseSkill = skills.has(stats, "Appraise", false);

        for (const itemName of itemNames) {
            const itemData =
                drops[itemName as DropName] ||
                weapons[itemName as WeaponName] ||
                artifacts[itemName as ArtifactName] ||
                misc[itemName as MiscName];

            if (!itemData) {
                messages.push(
                    `-# The item "${itemName}" doesn't exist. Make sure you typed it correctly.`,
                );
                continue;
            }

            if (
                weapons[itemName as WeaponName] &&
                stats.equippedWeapon === itemName
            ) {
                messages.push(
                    `-# You cannot sell "${itemName}" because it is currently equipped!`,
                );
                continue;
            }

            if (
                artifacts[itemName as ArtifactName] &&
                (stats.equippedFlower === itemName ||
                    stats.equippedPlume === itemName ||
                    stats.equippedSands === itemName ||
                    stats.equippedGoblet === itemName ||
                    stats.equippedCirclet === itemName)
            ) {
                messages.push(
                    `-# You cannot sell "${itemName}" because it is currently equipped!`,
                );
                continue;
            }

            const item = stats.inventory.find((c) => c.item === itemName);
            if (!item) {
                messages.push(`-# You don't have any "${itemName}" to sell.`);
                continue;
            }

            const amountToSell = item.amount;
            const rebirthBonus =
                (rebirthMultiplier - 1) * itemData.sellPrice * amountToSell;
            let itemTotalSellPrice =
                itemData.sellPrice * amountToSell * rebirthMultiplier;
            let appraiseBonus = 0;

            if (hasAppraiseSkill) {
                appraiseBonus = Math.round(itemTotalSellPrice * 0.05);
                itemTotalSellPrice = Math.round(
                    itemTotalSellPrice + appraiseBonus,
                );
                totalAppraiseBonus += appraiseBonus;
            } else {
                itemTotalSellPrice = Math.round(itemTotalSellPrice);
            }

            totalSellPrice += itemTotalSellPrice;
            totalRebirthBonus += rebirthBonus;

            stats.inventory = stats.inventory.filter(
                (c) => c.item !== item.item,
            );

            itemsSold.push({ itemName, amountToSell, itemTotalSellPrice });
        }

        if (itemsSold.length === 0) {
            return r.edit(
                embedComment(`No items were sold.\n${messages.join("\n")}`),
            );
        }

        await Promise.all([
            updateUserStats(i.user.id, {
                inventory: {
                    set: stats.inventory,
                },
            }),
            addBalance(
                i.user.id,
                totalSellPrice,
                true,
                `Sold items: ${itemsSold
                    .map(
                        (soldItem) =>
                            `${soldItem.amountToSell}x ${soldItem.itemName}`,
                    )
                    .join(", ")}`,
            ),
        ]);

        let responseMessage = itemsSold
            .map(
                (soldItem) =>
                    `-# Sold \`${soldItem.amountToSell}x\` **${soldItem.itemName}** for ${customEmoji.a.z_coins} \`${soldItem.itemTotalSellPrice} ${texts.c.u}\`!`,
            )
            .join("\n");

        if (stats.rebirths > 0) {
            responseMessage += `\n-# (+${Math.round(totalRebirthBonus)} ${
                texts.c.u
            } from [${stats.rebirths}] Rebirth${
                stats.rebirths > 1 ? "s" : ""
            })`;
        }

        if (hasAppraiseSkill && totalAppraiseBonus > 0) {
            responseMessage += `\n-# 🔍 (Total Appraisal Skill Bonus: +${totalAppraiseBonus} ${texts.c.u})`;
        }

        if (messages.length > 0) {
            responseMessage += `\n${messages.join("\n")}`;
        }

        return r.edit(embedComment(responseMessage, "Green"));
    },
});
