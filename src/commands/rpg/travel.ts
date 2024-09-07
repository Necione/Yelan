import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys, sleep } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";

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
    | "Jueyun Karst";

type LocationXY = {
    x: number;
    y: number;
};

const locations: Record<LocationName, LocationXY> = {
    "Liyue Harbor": { x: 15, y: 4 },
    "Qingxu Pool": { x: 7, y: 2 },
    "Lingju Pass": { x: 8, y: 4 },
    "Lumberpick Valley": { x: 5, y: 6 },
    "Dunyu Ruins": { x: 10, y: 7 },
    Nantianmen: { x: 3, y: 11 },
    "Tianqiu Valley": { x: 7, y: 9 },
    "Luhua Pool": { x: 13, y: 10 },
    "Guili Plains": { x: 15, y: 12 },
    "Jueyun Karst": { x: 7, y: 13 },
};

const locationEmojis: Record<LocationName, string> = {
    "Liyue Harbor": "⛵",
    "Qingxu Pool": "🏞️",
    "Lingju Pass": "🌉",
    "Lumberpick Valley": "🌲",
    "Dunyu Ruins": "🏛️",
    Nantianmen: "⛩️",
    "Tianqiu Valley": "⛰️",
    "Luhua Pool": "🏖️",
    "Guili Plains": "🏞️",
    "Jueyun Karst": "🗻",
};

function calculateDistance(
    start: LocationXY | undefined,
    end: LocationXY | undefined,
) {
    if (!start || !end) {
        throw new Error("Invalid locations provided for distance calculation.");
    }
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export const travel = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("travel")
        .setDescription("[RPG] Travel to different locations.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("location")
                .setDescription("Select the location to travel to")
                .setRequired(true)
                .addChoices(
                    ...getKeys(locations).map((c) => ({
                        name: c,
                        value: c,
                    })),
                ),
        ),
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
                embedComment(
                    "You cannot travel while you are hunting! Please finish your hunt first.",
                ),
            );
        }

        if (stats.isTravelling) {
            return r.edit(
                embedComment(
                    "You are already travelling! Please wait until you arrive at your destination.",
                ),
            );
        }

        let currentLocation = stats.location as LocationName;
        if (!locations[currentLocation]) {
            currentLocation = "Liyue Harbor";
            await updateUserStats(i.user.id, { location: currentLocation });
        }

        const selectedLocation = i.options.getString(
            "location",
            true,
        ) as LocationName;

        if (!locations[selectedLocation]) {
            return r.edit(embedComment("Invalid location selected."));
        }

        const startCoords = locations[currentLocation];
        const endCoords = locations[selectedLocation];

        const distance = calculateDistance(startCoords, endCoords);
        const travelTime = distance * 5;

        await updateUserStats(i.user.id, { isTravelling: true });

        const emoji = locationEmojis[selectedLocation];

        await r.edit(
            embedComment(
                `You are travelling to ${emoji} **${selectedLocation}**, which will take approximately ${Math.round(
                    travelTime,
                )} seconds.`,
            ),
        );

        await sleep(travelTime * 1000);

        await updateUserStats(i.user.id, {
            location: selectedLocation,
            isTravelling: false,
        });

        return r.edit(
            embedComment(
                `You have arrived at ${emoji} **${selectedLocation}**!\n-# Maybe try using </hunt:1279824112566665296> now?`,
            ),
        );
    },
});
