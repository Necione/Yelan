import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get, getKeys, is, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, getUserStats, updateUserStats } from "../../services";
import { cooldowns, locked } from "../../utils";
import { artifacts, type ArtifactName } from "../../utils/rpgitems/artifacts";
import { drops, type DropName } from "../../utils/rpgitems/drops";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const diffuse = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("diffuse")
        .setDescription("[RPG] diffuse an item or weapon from your inventory.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The item that you want to diffuse")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The amount to diffuse")
                .setRequired(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const list = [
            ...getKeys(drops),
            ...getKeys(weapons),
            ...getKeys(artifacts),
        ].map((c) => ({ name: c, value: c }));
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
        const amountTodiffuse = i.options.getInteger("amount", true);

        if (itemName === "n/a") {
            return r.edit(embedComment(`You didn't select a valid item.`));
        }

        const userWallet = await getProfileByUserId(i.user.id);
        if (!userWallet) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to find/create your user profile."),
            );
        }

        const cc = cooldowns.get(userWallet, "diffuse");
        if (!cc.status) {
            locked.del(i.user.id);
            return r.edit(embedComment(cc.message));
        }

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
            return r.edit(embedComment("You cannot diffuse while hunting!"));
        }

        if (
            weapons[itemName as WeaponName] &&
            stats.equippedWeapon === itemName
        ) {
            return r.edit(
                embedComment(
                    `You cannot diffuse "${itemName}" because it is currently equipped!`,
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
                    `You cannot diffuse "${itemName}" because it is currently equipped!`,
                ),
            );
        }

        const item = stats.inventory.find((c) => c.item === itemName);
        if (!item) {
            return r.edit(
                embedComment(
                    `You don't have "${itemName}" to diffuse.\n-# Check your inventory with </rpg:1279824112566665297>`,
                ),
            );
        }
        if (item.amount < amountTodiffuse) {
            return r.edit(
                embedComment(
                    `You don't have enough of "${itemName}" to diffuse.\n-# Check your inventory with </rpg:1279824112566665297>`,
                ),
            );
        }

        let totaldiffusePrice = itemData.sellPrice * amountTodiffuse;
        let totalHeal = Math.round(totaldiffusePrice / 2);
        const maxHP = stats.maxHP;
        const newHp = Math.min(stats.hp + totalHeal, maxHP);

        item.amount -= amountTodiffuse;
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
                hp: newHp,
            }),
        ]);

        await cooldowns.set(userWallet, "diffuse", get.mins(30));

        return r.edit(
            embedComment(
                `You diffused \`${amountTodiffuse}x\` **${itemName}** for 💗 \`${totalHeal} HP\`!`,
                "Green",
            ),
        );
    },
});
