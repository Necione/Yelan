import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { locked } from "../../utils";
import {
    getAvailableDirections,
    getCurrentMap,
} from "./abyssHelpers/directionHelper";

export const whereami = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("whereami")
        .setDescription(
            "[RPG] Displays your current floor, coordinates, and available moves.",
        )
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);

        try {
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

            if (stats.hp <= 0) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment(
                        "You're dead... go back up to the surface and recover.",
                    ),
                );
            }

            const currentFloor = stats.currentAbyssFloor || 1;
            const currentMap = getCurrentMap(currentFloor);

            if (!currentMap) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment(
                        `Current floor (${currentFloor}) map is not defined.`,
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
                const startingPosition = findPositionInMap(currentMap, "s");
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
                    currentAbyssFloor: currentFloor,
                });
                console.log(
                    `Starting Position Set to: (${currentX}, ${currentY})`,
                );
            }

            console.log(
                `Current Position on Floor ${currentFloor}: (${currentX}, ${currentY})`,
            );

            const availableDirections = getAvailableDirections(
                currentX,
                currentY,
                currentMap,
            );

            let message = `**Current Floor:** ${currentFloor}\nYou are currently at position \`${currentX}, ${currentY}\`.`;

            if (availableDirections.length > 0) {
                const directionsList = availableDirections.join(", ");
                message += `\n**Available Moves:** ${directionsList}.`;
            } else {
                message += `\nThere are no available directions to move from here.`;
            }

            await i.editReply(embedComment(message, "Blue"));

            locked.del(i.user.id);
        } catch (error) {
            console.error("Error in /whereami command:", error);
            locked.del(i.user.id);
            await i
                .editReply(
                    embedComment(
                        "An unexpected error occurred. Please try again later.",
                        "Red",
                    ),
                )
                .catch(noop);
        }
    },
});

function findPositionInMap(
    map: string[][],
    target: string,
    x?: number,
    y?: number,
): { x: number; y: number } | null {
    for (let rowIndex = 0; rowIndex < map.length; rowIndex++) {
        const row = map[rowIndex];
        for (let col = 0; col < row.length; col++) {
            if (row[col].toLowerCase() === target.toLowerCase()) {
                const calculatedY = map.length - 1 - rowIndex;
                if (
                    (x === undefined || col === x) &&
                    (y === undefined || calculatedY === y)
                ) {
                    return { x: col, y: calculatedY };
                }
            }
        }
    }
    return null;
}
