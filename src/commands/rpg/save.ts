import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../prisma";
import { getUserStats } from "../../services";

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
        const userId = i.user.id;

        if (!inputName) {
            return r.edit(embedComment("Loadout name cannot be empty."));
        }

        const stats = await getUserStats(userId);
        if (!stats) {
            return r.edit(
                embedComment("No stats found. Please set up your profile."),
            );
        }

        const loadoutName = inputName;

        const loadoutData = {
            userId,
            name: loadoutName,
            isPrivate,
            equippedWeapon: stats.equippedWeapon,
            equippedFlower: stats.equippedFlower,
            equippedPlume: stats.equippedPlume,
            equippedSands: stats.equippedSands,
            equippedGoblet: stats.equippedGoblet,
            equippedCirclet: stats.equippedCirclet,
        };

        try {
            const existing = await prisma.loadout.findUnique({
                where: {
                    user_loadout_unique: {
                        userId,
                        name: loadoutName,
                    },
                },
            });

            if (existing) {
                await prisma.loadout.update({
                    where: { id: existing.id },
                    data: loadoutData,
                });
                return r.edit(
                    embedComment(`Loadout **${inputName}** has been updated.`),
                );
            } else {
                await prisma.loadout.create({
                    data: loadoutData,
                });
                return r.edit(
                    embedComment(`Loadout **${inputName}** has been saved.`),
                );
            }
        } catch (error) {
            console.error("Error saving loadout:", error);
            return r.edit(
                embedComment("An error occurred while saving your loadout."),
            );
        }
    },
});
