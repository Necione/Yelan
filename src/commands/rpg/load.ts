import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, noop } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../prisma";
import { getUserStats, syncStats } from "../../services";
import {
    calculateStatChanges,
    getSetBonusMessages,
} from "../../utils/artifactHelper";


export const load = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("load")
        .setDescription("[RPG] Load a saved loadout to equip your items.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Name of the loadout to load")
                .setRequired(true)
                .setAutocomplete(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const focused = i.options.getFocused(true);
        const input = focused.value.toLowerCase();
        const userId = i.user.id;
        const username = i.user.username;

        const loadouts = await prisma.loadout.findMany({
            where: {
                userId,
                name: {
                    contains: input,
                    mode: "insensitive",
                },
            },
            take: 25,
        }).catch(() => []);

        const options = loadouts.map((loadout) => ({
            name: loadout.isPrivate
                ? `${username}'s ${loadout.name} (Private)`
                : `${username}'s ${loadout.name}`,
            value: loadout.name,
        }));

        if (!is.array(options)) {
            return i
                .respond([{ name: "No loadouts found.", value: "n/a" }])
                .catch(noop);
        }

        return i.respond(options).catch(noop);
    },
    async execute(i, r) {
        const inputName = i.options.getString("name", true);
        const userId = i.user.id;

        if (!inputName) {
            return r.edit(embedComment("Loadout name cannot be empty."));
        }

        const loadout = await prisma.loadout.findUnique({
            where: {
                user_loadout_unique: {
                    userId: i.user.id,
                    name: inputName,
                },
            },
        }).catch(noop);

        if (!loadout) {
            return r.edit(
                embedComment(`Loadout **${inputName}** not found.`),
            );
        }

        const stats = await getUserStats(userId);
        if (!stats) {
            return r.edit(
                embedComment("No stats found. Please set up your profile."),
            );
        }

        const itemsToEquip = [
            loadout.equippedWeapon,
            loadout.equippedFlower,
            loadout.equippedPlume,
            loadout.equippedSands,
            loadout.equippedGoblet,
            loadout.equippedCirclet,
        ].filter(Boolean) as string[];


        if (!is.array(itemsToEquip)) {
            return r.edit(
                embedComment("The selected loadout has no items to equip."),
            );
        }

        const hasAllItems = itemsToEquip.every((item) =>
            stats.inventory.some(
                (invItem) =>
                    invItem.item.toLowerCase() === item.toLowerCase(),
            ),
        );

        if (!hasAllItems) {
            return r.edit(
                embedComment(
                    "You do not possess all items required by this loadout.",
                ),
            );
        }

        if (!stats) {
            return r.edit(
                embedComment("No stats found. Please set up your profile."),
            );
        }

        await prisma.userStats.update({
            where: { userId },
            data: {
                equippedWeapon: loadout.equippedWeapon
                    ? { set: loadout.equippedWeapon }
                    : { set: null },
                equippedFlower: loadout.equippedFlower
                    ? { set: loadout.equippedFlower }
                    : { set: null },
                equippedPlume: loadout.equippedPlume
                    ? { set: loadout.equippedPlume }
                    : { set: null },
                equippedSands: loadout.equippedSands
                    ? { set: loadout.equippedSands }
                    : { set: null },
                equippedGoblet: loadout.equippedGoblet
                    ? { set: loadout.equippedGoblet }
                    : { set: null },
                equippedCirclet: loadout.equippedCirclet
                    ? { set: loadout.equippedCirclet }
                    : { set: null },
            },
        }).catch(noop);
        const updatedStats = await syncStats(userId);

        const statChanges = calculateStatChanges(
            stats,
            updatedStats as UserStats,
        );
        const setBonusMessages = getSetBonusMessages(
            stats,
            updatedStats as UserStats,
            "activated",
        );

        return r.edit(
            embedComment(
                `Loadout **${loadout.name.replace(
                    `${userId}'s `,
                    "",
                )}** has been loaded successfully!\n${[
                    ...statChanges,
                    ...setBonusMessages,
                ].join("\n")}`,
                "Green",
            ),
        );
    },
});
