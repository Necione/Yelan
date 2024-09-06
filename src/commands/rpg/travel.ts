import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, sleep } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { locked } from "../../utils";

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

const locations: Record<LocationName, { x: number; y: number }> = {
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

function calculateDistance(
    start: { x: number; y: number },
    end: { x: number; y: number },
) {
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
                    { name: "Liyue Harbor", value: "Liyue Harbor" },
                    { name: "Qingxu Pool", value: "Qingxu Pool" },
                    { name: "Lingju Pass", value: "Lingju Pass" },
                    { name: "Lumberpick Valley", value: "Lumberpick Valley" },
                    { name: "Dunyu Ruins", value: "Dunyu Ruins" },
                    { name: "Nantianmen", value: "Nantianmen" },
                    { name: "Tianqiu Valley", value: "Tianqiu Valley" },
                    { name: "Luhua Pool", value: "Luhua Pool" },
                    { name: "Guili Plains", value: "Guili Plains" },
                    { name: "Jueyun Karst", value: "Jueyun Karst" },
                ),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const stats = await getUserStats(i.user.id);

        if (!stats) {
            locked.del(i.user.id);
            return i.editReply(
                embedComment(
                    "No stats found for you, please set up your profile.",
                ),
            );
        }

        if (stats.isTravelling) {
            return i.editReply(
                embedComment(
                    "You are already travelling! Please wait until you arrive at your destination.",
                ),
            );
        }

        const selectedLocation = i.options.getString(
            "location",
            true,
        ) as LocationName;

        if (!locations[selectedLocation]) {
            return i.editReply(embedComment("Invalid location selected."));
        }

        const startCoords = locations[stats.location as LocationName];
        const endCoords = locations[selectedLocation];

        const distance = calculateDistance(startCoords, endCoords);
        const travelTime = distance * 5;

        await updateUserStats(i.user.id, { isTravelling: true });

        await i.editReply(
            embedComment(
                `You are travelling to ${selectedLocation}, which will take approximately ${Math.round(
                    travelTime,
                )} seconds.`,
            ),
        );

        await sleep(travelTime * 1000);

        await updateUserStats(i.user.id, {
            location: selectedLocation,
            isTravelling: false,
        });

        return i.editReply(
            embedComment(
                `You have arrived at ${selectedLocation}. Welcome and enjoy your stay!`,
            ),
        );
    },
});
