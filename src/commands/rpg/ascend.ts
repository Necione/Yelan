import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, noop, snowflakes } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { weapons } from "../../utils/rpgitems/weapons";
import { getBaseName, getPrefix } from "./handlers/utils";

export const ascend = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("ascend")
        .setDescription(
            "[RPG] Ascend a weapon by combining 3x of the same weapon.",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("weapon")
                .setDescription("The weapon you want to ascend")
                .setRequired(true)
                .setAutocomplete(true),
        ),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async autocomplete(i) {
        const focused = i.options.getFocused(true);
        const input = focused.value.toLowerCase();

        const ascendableBaseWeapons = ["Harbinger of Dawn", "Messenger"];

        const ascendableWeapons = Object.keys(weapons).filter((weaponName) => {
            const baseName = getBaseName(weaponName);

            const isAscended = baseName.startsWith("✪ ");
            if (isAscended) {
                return false;
            }

            return ascendableBaseWeapons.includes(baseName);
        });

        const filtered = ascendableWeapons
            .filter((weaponName) => weaponName.toLowerCase().includes(input))
            .map((weaponName) => ({
                name: weaponName,
                value: weaponName,
            }));

        if (!is.array(filtered)) {
            return i
                .respond([
                    { name: "No ascendable weapons found.", value: "n/a" },
                ])
                .catch(noop);
        }

        return i.respond(filtered.slice(0, 25)).catch(noop);
    },
    async execute(i, r) {
        const weaponName = i.options.getString("weapon", true);

        if (weaponName === "n/a") {
            return r.edit(embedComment("You provided an invalid weapon name."));
        }

        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r
                .edit(
                    embedComment(
                        "No stats found for you. Please set up your profile.",
                    ),
                )
                .catch(noop);
        }

        if (stats.isHunting) {
            return r
                .edit(embedComment("You cannot ascend weapons while hunting!"))
                .catch(noop);
        }

        const prefix = getPrefix(weaponName);
        const baseName = getBaseName(weaponName);
        const ascendableBaseWeapons = ["Harbinger of Dawn", "Messenger"];

        if (!ascendableBaseWeapons.includes(baseName)) {
            return r
                .edit(
                    embedComment(
                        `The weapon **${weaponName}** cannot be ascended.`,
                    ),
                )
                .catch(noop);
        }

        const inventoryItem = stats.inventory.find(
            (item) => item.item === weaponName,
        );
        if (!inventoryItem || inventoryItem.amount < 3) {
            return r
                .edit(
                    embedComment(
                        `You need at least 3x **${weaponName}** to ascend.`,
                    ),
                )
                .catch(noop);
        }

        const ascendedBaseName = `✪ ${baseName}`;
        const ascendedWeaponName = prefix
            ? `${prefix} ${ascendedBaseName}`
            : ascendedBaseName;

        if (!weapons[ascendedWeaponName]) {
            return r
                .edit(
                    embedComment(
                        `The ascended variant for **${weaponName}** does not exist.`,
                    ),
                )
                .catch(noop);
        }

        const existingAscended = stats.inventory.find(
            (item) => item.item === ascendedWeaponName,
        );
        if (existingAscended && existingAscended.amount >= 1) {
            return r
                .edit(
                    embedComment(
                        `You already have the ascended variant **${ascendedWeaponName}**.`,
                    ),
                )
                .catch(noop);
        }

        const updatedInventory = stats.inventory
            .map((item) => {
                if (item.item === weaponName) {
                    item.amount = Math.floor(item.amount - 10);
                }
                return item;
            })
            .filter((item) => item.amount > 0);

        if (existingAscended) {
            existingAscended.amount += 1;
            updatedInventory.push(existingAscended);
        } else {
            updatedInventory.push({
                id: snowflakes.generate(),
                item: ascendedWeaponName,
                amount: 1,
                metadata: null,
            });
        }

        await updateUserStats(i.user.id, {
            inventory: { set: updatedInventory },
        });

        return r
            .edit(
                embedComment(
                    `You have successfully ascended 3x **${weaponName}** into 1x **${ascendedWeaponName}**!`,
                    "Green",
                ),
            )
            .catch(noop);
    },
});
