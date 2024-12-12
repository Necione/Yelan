import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, noop, time } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { prisma } from "../../prisma";
import { loadouts } from "../../services";
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
        const loadouts = await prisma.loadout
            .findMany({
                where: {
                    userId: i.user.id,
                    name: {
                        contains: i.options
                            .getFocused(true)
                            .value.toLowerCase(),
                        mode: "insensitive",
                    },
                },
                take: 25,
            })
            .catch(() => []);

        const options = loadouts.map((loadout) => ({
            name: loadout.isPrivate
                ? `${i.user.username}'s ${loadout.name} (Private)`
                : `${i.user.username}'s ${loadout.name}`,
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
        const inputName = i.options.getString("name", true).trim();
        if (!inputName) {
            return r.edit(embedComment("Loadout name cannot be empty."));
        }
        const loadout = await loadouts.get(i.user, inputName);
        if (!loadout) {
            return r.edit(embedComment(`Loadout **${inputName}** not found.`));
        }

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
                `**Created By:** ${i.user.toString()}\n**Created At:** ${time.long.dateTime(
                    loadout.createdAt,
                )}`,
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
    },
});
