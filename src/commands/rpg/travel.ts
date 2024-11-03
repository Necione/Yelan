import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { sleep } from "@elara-services/utils";
import {
    ActionRowBuilder,
    ButtonBuilder,
    type ButtonInteraction,
    ButtonStyle,
    type Collection,
    ComponentType,
    EmbedBuilder,
    type Message,
    SlashCommandBuilder,
} from "discord.js";
import { getUserStats, updateUserStats } from "../../services";

type RegionName = "Liyue" | "Inazuma";

type LocationName =
    | "Liyue Harbor"
    | "Qingxu Pool"
    | "Lingju Pass"
    | "Lumberpick Valley"
    | "Dunyu Ruins"
    | "Nantianmen"
    | "Tianqiu Valley"
    | "Luhua Pool"
    | "Guili Plains"
    | "Jueyun Karst"
    | "Ritou";

type LocationXY = {
    x: number;
    y: number;
    requiredRebirths?: number;
    region: RegionName;
};

const locations: Record<LocationName, LocationXY> = {
    "Liyue Harbor": { x: 15, y: 4, region: "Liyue" },
    "Qingxu Pool": { x: 7, y: 2, region: "Liyue" },
    "Lingju Pass": { x: 8, y: 4, region: "Liyue" },
    "Lumberpick Valley": { x: 5, y: 6, region: "Liyue" },
    "Dunyu Ruins": { x: 10, y: 7, region: "Liyue" },
    Nantianmen: { x: 3, y: 11, region: "Liyue" },
    "Tianqiu Valley": { x: 7, y: 9, region: "Liyue" },
    "Luhua Pool": { x: 13, y: 10, region: "Liyue" },
    "Guili Plains": { x: 15, y: 12, region: "Liyue" },
    "Jueyun Karst": { x: 7, y: 13, region: "Liyue" },
    Ritou: { x: 45, y: -20, region: "Inazuma" },
};

const locationEmojis: Record<LocationName, string> = {
    "Liyue Harbor": "⛵",
    "Qingxu Pool": "🏞️",
    "Lingju Pass": "🌉",
    "Lumberpick Valley": "🌲",
    "Dunyu Ruins": "🏛️",
    Nantianmen: "🏮",
    "Tianqiu Valley": "⛰️",
    "Luhua Pool": "🏖️",
    "Guili Plains": "🏞️",
    "Jueyun Karst": "🗻",
    Ritou: "⛩️",
};

function calculateDistance(start: LocationXY, end: LocationXY) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy);
}

interface DirectionalLocations {
    north?: { location: LocationName; distance: number };
    south?: { location: LocationName; distance: number };
    east?: { location: LocationName; distance: number };
    west?: { location: LocationName; distance: number };
}

export const travel = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("travel")
        .setDescription("[RPG] Travel to different locations.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit({
                embeds: [
                    new EmbedBuilder().setDescription(
                        "No stats found for you, please set up your profile.",
                    ),
                ],
            });
        }

        if (stats.isHunting || stats.abyssMode) {
            return r.edit({
                embeds: [
                    new EmbedBuilder().setDescription(
                        "You cannot travel right now!",
                    ),
                ],
            });
        }

        if (stats.isTravelling) {
            return r.edit({
                embeds: [
                    new EmbedBuilder().setDescription(
                        "You are already travelling! Please wait until you arrive at your destination.",
                    ),
                ],
            });
        }

        let currentLocation = stats.location as LocationName;
        if (!locations[currentLocation]) {
            currentLocation = "Liyue Harbor";
            await updateUserStats(i.user.id, { location: currentLocation });
        }

        const currentCoords = locations[currentLocation];

        const isAtPort =
            currentLocation === "Liyue Harbor" || currentLocation === "Ritou";

        const currentRegion = currentCoords.region;

        const directionalLocations: DirectionalLocations = {};

        for (const [locationName, coords] of Object.entries(locations)) {
            if (locationName === currentLocation) {
                continue;
            }
            if (coords.region !== currentRegion) {
                continue;
            }

            const dx = coords.x - currentCoords.x;
            const dy = coords.y - currentCoords.y;
            const distance = calculateDistance(currentCoords, coords);

            let direction: "north" | "south" | "east" | "west" | null = null;

            if (dy > 0 && Math.abs(dy) >= Math.abs(dx)) {
                direction = "north";
            } else if (dy < 0 && Math.abs(dy) >= Math.abs(dx)) {
                direction = "south";
            } else if (dx > 0 && Math.abs(dx) > Math.abs(dy)) {
                direction = "east";
            } else if (dx < 0 && Math.abs(dx) > Math.abs(dy)) {
                direction = "west";
            }

            if (direction) {
                const existing = directionalLocations[direction];
                if (!existing || distance < existing.distance) {
                    directionalLocations[direction] = {
                        location: locationName as LocationName,
                        distance,
                    };
                }
            }
        }

        let travelOptions: LocationName[] = Object.values(
            directionalLocations,
        ).map((d) => d.location);

        if (isAtPort) {
            if (currentLocation === "Liyue Harbor") {
                if (stats.worldLevel >= 20) {
                    travelOptions.push("Ritou");
                }
            } else if (currentLocation === "Ritou") {
                travelOptions.push("Liyue Harbor");
            }
        }

        travelOptions = Array.from(new Set(travelOptions));

        if (travelOptions.length === 0) {
            return r.edit({
                embeds: [
                    new EmbedBuilder().setDescription(
                        "There are no available locations to travel to from here.",
                    ),
                ],
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("Travel Options")
            .setDescription(
                `You are currently at ${locationEmojis[currentLocation]} **${currentLocation}**.\n\nSelect a location to travel to:`,
            );

        const buttons = travelOptions.map((loc) =>
            new ButtonBuilder()
                .setCustomId(`travel_${loc}`)
                .setLabel(`${locationEmojis[loc]} ${loc}`)
                .setStyle(ButtonStyle.Primary),
        );

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...buttons,
        );

        await r.edit({ embeds: [embed], components: [actionRow] });
        const message = (await i.fetchReply()) as Message;

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
        });

        collector.on("collect", async (interaction: ButtonInteraction) => {
            if (interaction.user.id !== i.user.id) {
                return interaction.reply({
                    content: "This button is not for you!",
                    ephemeral: true,
                });
            }

            const selectedLocation = interaction.customId.replace(
                "travel_",
                "",
            ) as LocationName;

            if (!locations[selectedLocation]) {
                return interaction.reply({
                    content: "Invalid location selected.",
                    ephemeral: true,
                });
            }

            const targetRegion = locations[selectedLocation].region;
            if (
                targetRegion === "Inazuma" &&
                stats.worldLevel < 20 &&
                currentLocation !== "Ritou"
            ) {
                return interaction.reply({
                    content:
                        "You need to be world level 20 or higher to travel to Inazuma.",
                    ephemeral: true,
                });
            }

            collector.stop();

            const startCoords = currentCoords;
            const endCoords = locations[selectedLocation];

            const distance = calculateDistance(startCoords, endCoords);
            const travelTime = isAtPort ? 30 : distance * 10;

            const arrivalTimestamp =
                Math.round(Date.now() / 1000) + Math.round(travelTime);

            await updateUserStats(i.user.id, { isTravelling: true });

            const emoji = locationEmojis[selectedLocation];

            await interaction.update({
                content: null,
                embeds: [
                    new EmbedBuilder().setDescription(
                        `You are travelling to ${emoji} **${selectedLocation}**.\nYou will arrive <t:${arrivalTimestamp}:R>!`,
                    ),
                ],
                components: [],
            });

            await sleep(travelTime * 1000);

            await updateUserStats(i.user.id, {
                location: selectedLocation,
                isTravelling: false,
            });

            await i.followUp({
                embeds: [
                    new EmbedBuilder().setDescription(
                        `You have arrived at ${emoji} **${selectedLocation}**!`,
                    ),
                ],
            });
        });

        collector.on(
            "end",
            async (collected: Collection<string, ButtonInteraction>) => {
                if (collected.size === 0) {
                    const disabledButtons = buttons.map((button) =>
                        button.setDisabled(true),
                    );
                    const disabledActionRow =
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            ...disabledButtons,
                        );
                    await message.edit({ components: [disabledActionRow] });
                }
            },
        );
    },
});
