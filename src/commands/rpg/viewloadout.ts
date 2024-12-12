import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { prisma } from "../../prisma";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

const artifactSlotEmojis: Record<string, string> = {
    Flower: "🌸",
    Plume: "🪶",
    Sands: "⏳",
    Goblet: "🍷",
    Circlet: "👑",
};

export const viewloadout = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("viewloadout")
        .setDescription("[RPG] View details of a saved loadout.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Name of the loadout to view")
                .setRequired(true)
                .setAutocomplete(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const focused = i.options.getFocused(true);
        const input = focused.value.toLowerCase();
        const userId = i.user.id;
        const username = i.user.username;

        try {
            const loadouts = await prisma.loadout.findMany({
                where: {
                    userId,
                    name: {
                        contains: input,
                        mode: "insensitive",
                    },
                },
                take: 25,
            });

            const options = loadouts.map((loadout) => ({
                name: loadout.isPrivate
                    ? `${username}'s ${loadout.name} (Private)`
                    : `${username}'s ${loadout.name}`,
                value: loadout.name,
            }));

            if (options.length === 0) {
                return i
                    .respond([{ name: "No loadouts found.", value: "n/a" }])
                    .catch(noop);
            }

            return i.respond(options).catch(noop);
        } catch (error) {
            console.error("Error fetching loadouts:", error);
            return i
                .respond([{ name: "Error fetching loadouts.", value: "n/a" }])
                .catch(noop);
        }
    },

    async execute(i, r) {
        const inputName = i.options.getString("name", true).trim();
        const userId = i.user.id;

        if (!inputName) {
            return r.edit(embedComment("Loadout name cannot be empty."));
        }

        try {
            const loadout = await prisma.loadout.findUnique({
                where: {
                    user_loadout_unique: {
                        userId,
                        name: inputName,
                    },
                },
            });

            if (!loadout) {
                return r.edit(
                    embedComment(`Loadout **${inputName}** not found.`),
                );
            }

            const unixTimestamp = Math.floor(
                loadout.createdAt.getTime() / 1000,
            );
            const creationTimeDiscord = `<t:${unixTimestamp}:F>`;

            const equippedItems = [
                { slot: "Weapon", item: loadout.equippedWeapon },
                { slot: "Flower", item: loadout.equippedFlower },
                { slot: "Plume", item: loadout.equippedPlume },
                { slot: "Sands", item: loadout.equippedSands },
                { slot: "Goblet", item: loadout.equippedGoblet },
                { slot: "Circlet", item: loadout.equippedCirclet },
            ]
                .filter((entry) => entry.item)
                .map((entry) => {
                    let emoji = "";

                    if (entry.slot === "Weapon") {
                        if (entry.item && weapons[entry.item as WeaponName]) {
                            emoji = weapons[entry.item as WeaponName].emoji;
                        }
                    } else {
                        emoji = artifactSlotEmojis[entry.slot] || "📦";
                    }

                    if (!emoji) {
                        emoji = "📦";
                    }

                    return `**${entry.slot}:** ${emoji} ${entry.item}`;
                });

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle(`Loadout: ${inputName}`)
                .setDescription(
                    `**Created By:** <@${userId}>\n**Created At:** ${creationTimeDiscord}`,
                )
                .addFields({
                    name: "Equipped Items",
                    value:
                        equippedItems.length > 0
                            ? equippedItems.join("\n")
                            : "No items equipped.",
                })
                .setFooter({ text: "Use /load to equip this loadout." });

            return r.edit({ embeds: [embed] });
        } catch (error) {
            console.error("Error viewing loadout:", error);
            return r.edit(
                embedComment("An error occurred while viewing the loadout."),
            );
        }
    },
});
