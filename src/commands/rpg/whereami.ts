import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { locked } from "../../utils";
import { floor1Map } from "./abyssHelpers/floor1map";

const directions = {
    up: { dx: 0, dy: 1 },
    down: { dx: 0, dy: -1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
};

function getAvailableDirections(
    x: number,
    y: number,
    map: string[][],
): string[] {
    const available: string[] = [];

    for (const [direction, delta] of Object.entries(directions)) {
        const potentialX = x + delta.dx;
        const potentialY = y + delta.dy;

        if (
            potentialX < 0 ||
            potentialX >= map[0].length ||
            potentialY < 0 ||
            potentialY >= map.length
        ) {
            continue;
        }

        const rowIndex = map.length - 1 - potentialY;
        const cell = map[rowIndex][potentialX].toLowerCase();

        if (cell !== "w") {
            available.push(
                direction.charAt(0).toUpperCase() + direction.slice(1),
            );
        }
    }

    return available;
}

export const whereami = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("whereami")
        .setDescription(
            "[RPG] Displays your current coordinates and available moves.",
        )
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);

        if (!i.deferred) {
            locked.del(i.user.id);
            return;
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "No stats found for you, please set up your profile.",
                ),
            );
        }

        if (!stats.abyssMode) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "You are not in Abyss Mode. Use `/abyss` to enter the Abyss.",
                ),
            );
        }

        let currentX = stats.abyssCoordX;
        let currentY = stats.abyssCoordY;

        if (
            currentX === null ||
            currentX === undefined ||
            currentY === null ||
            currentY === undefined
        ) {
            const startingPosition = findPositionInMap(floor1Map, "s");
            if (!startingPosition) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment("Starting position not found in the map."),
                );
            }
            currentX = startingPosition.x;
            currentY = startingPosition.y;

            await updateUserStats(i.user.id, {
                abyssCoordX: currentX,
                abyssCoordY: currentY,
            });
            console.log(`Starting Position Set to: (${currentX}, ${currentY})`);
        }

        console.log(`Current Position: (${currentX}, ${currentY})`);

        const availableDirections = getAvailableDirections(
            currentX,
            currentY,
            floor1Map,
        );

        let message = `You are currently at position \`${currentX}, ${currentY}\`.`;

        if (availableDirections.length > 0) {
            const directionsList = availableDirections.join(", ");
            message += `\n**Available Moves:** ${directionsList}.`;
        } else {
            message += `\nThere are no available directions to move from here.`;
        }

        await i.editReply(embedComment(message, "Blue"));

        locked.del(i.user.id);
    },
});

function findPositionInMap(
    map: string[][],
    target: string,
): { x: number; y: number } | null {
    for (let rowIndex = 0; rowIndex < map.length; rowIndex++) {
        const row = map[rowIndex];
        for (let x = 0; x < row.length; x++) {
            if (row[x].toLowerCase() === target.toLowerCase()) {
                const y = map.length - 1 - rowIndex;
                return { x, y };
            }
        }
    }
    return null;
}
