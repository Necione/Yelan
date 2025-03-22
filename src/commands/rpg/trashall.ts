import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const trashall = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("trashall")
        .setDescription("[RPG] Remove all Worthless weapons from your inventory")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    "No stats found for you, please set up your profile.",
                ),
            );
        }

        if (stats.isHunting) {
            return r.edit(
                embedComment("You cannot trash items while hunting!"),
            );
        }

        if (!is.array(stats.inventory)) {
            return r.edit(embedComment("Your inventory is empty."));
        }

        const worthlessWeapons = stats.inventory.filter((item) => {
            const itemName = item.item;
            return (
                itemName.startsWith("Worthless ") &&
                weapons[itemName.replace("Worthless ", "") as WeaponName]
            );
        });

        if (worthlessWeapons.length === 0) {
            return r.edit(
                embedComment("You don't have any Worthless weapons to remove."),
            );
        }

        const updatedInventory = stats.inventory.filter((item) => {
            const itemName = item.item;
            return !(
                itemName.startsWith("Worthless ") &&
                weapons[itemName.replace("Worthless ", "") as WeaponName]
            );
        });

        await updateUserStats(i.user.id, {
            inventory: {
                set: updatedInventory,
            },
        });

        return r.edit(
            embedComment(
                `Successfully removed ${worthlessWeapons.length} Worthless weapon(s) from your inventory.`,
            ),
        );
    },
});
