import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { locationGroupWeights } from "../../utils/locationGroupWeights";

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

type Location = {
    region: RegionName;
    requiredAR?: number;
};

export const locations: Record<LocationName, Location> = {
    "Liyue Harbor": { region: "Liyue" },
    "Qingxu Pool": { region: "Liyue" },
    "Lingju Pass": { region: "Liyue" },
    "Lumberpick Valley": { region: "Liyue" },
    "Dunyu Ruins": { region: "Liyue" },
    Nantianmen: { region: "Liyue" },
    "Tianqiu Valley": { region: "Liyue" },
    "Luhua Pool": { region: "Liyue" },
    "Guili Plains": { region: "Liyue" },
    "Jueyun Karst": { region: "Liyue" },
    Ritou: { region: "Inazuma", requiredAR: 30 },
};

export const locationEmojis: Record<LocationName, string> = {
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

function getCommonEnemyTypes(location: LocationName): string[] {
    const locationWeights =
        locationGroupWeights[location] || locationGroupWeights["Default"];
    return Object.entries(locationWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([group]) => group);
}

export const travel = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("travel")
        .setDescription("[RPG] Travel to different locations.")
        .addStringOption((option) =>
            option
                .setName("location")
                .setDescription("The location to travel to")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .setDMPermission(false),
    defer: { silent: false },
    async autocomplete(i) {
        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return i
                .respond([{ name: "No stats found.", value: "n/a" }])
                .catch(noop);
        }

        const focusedValue = i.options.getFocused()?.toLowerCase() || "";

        const availableLocations = Object.entries(locations)
            .filter(([, location]) => {
                if (!location.requiredAR) {
                    return true;
                }
                return stats.adventureRank >= location.requiredAR;
            })
            .map(([name]) => ({
                name,
                value: name,
            }))
            .filter((loc) => loc.name.toLowerCase().includes(focusedValue));

        if (!availableLocations.length) {
            return i
                .respond([{ name: "No locations found.", value: "n/a" }])
                .catch(noop);
        }

        return i.respond(availableLocations.slice(0, 25)).catch(noop);
    },
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
            await updateUserStats(i.user.id, {
                location: { set: currentLocation },
            });
        }

        const selectedLocation = i.options.getString(
            "location",
            true,
        ) as LocationName;

        if (!locations[selectedLocation]) {
            return r.edit(embedComment("Invalid location selected."));
        }

        if (selectedLocation === currentLocation) {
            return r.edit(embedComment("You are already at this location!"));
        }

        const targetLocation = locations[selectedLocation];
        if (
            targetLocation.requiredAR &&
            stats.adventureRank < targetLocation.requiredAR
        ) {
            return r.edit(
                embedComment(
                    `You need to be Adventure Rank ${targetLocation.requiredAR} or higher to travel to ${selectedLocation}.`,
                ),
            );
        }

        await updateUserStats(i.user.id, {
            location: { set: selectedLocation },
        });

        const emoji = locationEmojis[selectedLocation];
        const commonEnemies = getCommonEnemyTypes(selectedLocation);
        const enemyList = commonEnemies
            .map((enemy) => `\`${enemy}\``)
            .join(", ");

        return r.edit(
            embedComment(
                `You have arrived at ${emoji} **${selectedLocation}**!\nCommon enemies in this area: ${enemyList}`,
                "Green",
            ),
        );
    },
});
