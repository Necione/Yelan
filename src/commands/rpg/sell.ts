import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { addBalance, getUserStats, updateUserStats } from "../../services";
import { artifacts, type ArtifactName } from "../../utils/rpgitems/artifacts";
import { drops, type DropName } from "../../utils/rpgitems/items";
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
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The amount to sell")
                .setRequired(true),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const itemName = i.options.getString("item", true);
        const amountToSell = i.options.getInteger("amount", true);

        const itemData =
            drops[itemName as DropName] ||
            weapons[itemName as WeaponName] ||
            artifacts[itemName as ArtifactName];

        if (!itemData) {
            return r.edit(
                embedComment(
                    `The item "${itemName}" doesn't exist. Make sure you typed it correctly.`,
                ),
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

        const item = stats.inventory.find((c) => c.item === itemName);
        if (!item) {
            return r.edit(
                embedComment(
                    `You don't have "${itemName}" to sell.\n-# Check your inventory with </rpg:1279824112566665297>`,
                ),
            );
        }
        if (item.amount < amountToSell) {
            return r.edit(
                embedComment(
                    `You don't have enough of "${itemName}" to sell.\n-# Check your inventory with </rpg:1279824112566665297>`,
                ),
            );
        }

        let totalSellPrice = itemData.sellPrice * amountToSell;
        let appraiseBonusMessage = "";
        let appraiseBonus = 0;

        const hasAppraiseSkill = stats.skills.some(
            (skill) => skill.name === "Appraise",
        );

        if (hasAppraiseSkill) {
            appraiseBonus = Math.round(totalSellPrice * 0.05);
            totalSellPrice = Math.round(totalSellPrice + appraiseBonus);
            appraiseBonusMessage = `\n-# 🔍 (Appraisal Skill Bonus: +${appraiseBonus} ${texts.c.u})`;
        } else {
            totalSellPrice = Math.round(totalSellPrice);
        }

        item.amount -= amountToSell;
        if (item.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (c) => c.item !== item.item,
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
                `Sold ${amountToSell}x ${itemName}`,
            ),
        ]);

        return r.edit(
            embedComment(
                `You sold \`${amountToSell}x\` **${itemName}** for ${customEmoji.a.z_coins} \`${totalSellPrice} ${texts.c.u}\`${appraiseBonusMessage}!`,
                "Green",
            ),
        );
    },
});
