import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys, is, noop } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { addBalance, getUserStats, updateUserStats } from "../../services";
import { artifacts, type ArtifactName } from "../../utils/rpgitems/artifacts";
import { drops, type DropName } from "../../utils/rpgitems/drops";
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
                .setRequired(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const list = [
            ...getKeys(drops),
            ...getKeys(weapons),
            ...getKeys(artifacts),
            ...getKeys(misc),
        ].map((c) => ({ name: String(c), value: c }));
        const item = i.options.getString("item", false) ?? "";
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
        const itemName = i.options.getString("item", true);
        const amountToSell = i.options.getInteger("amount", true);

        if (itemName === "n/a") {
            return r.edit(embedComment(`You didn't select a valid item.`));
        }

        const itemData =
            drops[itemName as DropName] ||
            weapons[itemName as WeaponName] ||
            artifacts[itemName as ArtifactName] ||
            misc[itemName as MiscName];

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

        const rebirthMultiplier =
            1 +
            Math.min(stats.rebirths, 3) * 0.2 +
            Math.max(0, stats.rebirths - 3) * 0.1;
        const rebirthBonus =
            (rebirthMultiplier - 1) * itemData.sellPrice * amountToSell;

        let totalSellPrice =
            itemData.sellPrice * amountToSell * rebirthMultiplier;
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

        const rebirthBonusMessage =
            stats.rebirths > 0
                ? ` (+${Math.round(rebirthBonus)} ${texts.c.u} from [${
                      stats.rebirths
                  }] Rebirth${stats.rebirths > 1 ? "s" : ""})`
                : "";

        return r.edit(
            embedComment(
                `You sold \`${amountToSell}x\` **${itemName}** for ${customEmoji.a.z_coins} \`${totalSellPrice} ${texts.c.u}\`${rebirthBonusMessage}${appraiseBonusMessage}!`,
                "Green",
            ),
        );
    },
});
