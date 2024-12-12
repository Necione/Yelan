import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, loadouts } from "../../services";

export const save = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("save")
        .setDescription(
            "[RPG] Save your current equipped items into a loadout.",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Name of the loadout")
                .setRequired(true),
        )
        .addBooleanOption((option) =>
            option
                .setName("private")
                .setDescription("Whether the loadout is private")
                .setRequired(false),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const inputName = i.options.getString("name", true).trim();
        const isPrivate = i.options.getBoolean("private") ?? true;

        if (!inputName) {
            return r.edit(embedComment("Loadout name cannot be empty."));
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment("No stats found. Please set up your profile."),
            );
        }

        const loadoutData = {
            userId: i.user.id,
            name: inputName,
            isPrivate,
            equippedWeapon: stats.equippedWeapon,
            equippedFlower: stats.equippedFlower,
            equippedPlume: stats.equippedPlume,
            equippedSands: stats.equippedSands,
            equippedGoblet: stats.equippedGoblet,
            equippedCirclet: stats.equippedCirclet,
        };
        const existing = await loadouts.get(i.user, inputName);

        if (existing) {
            await loadouts.update(existing.id, loadoutData);
            return r.edit(
                embedComment(`Loadout **${inputName}** has been updated.`),
            );
        } else {
            await loadouts.create(loadoutData);
            return r.edit(
                embedComment(`Loadout **${inputName}** has been saved.`),
            );
        }
    },
});
