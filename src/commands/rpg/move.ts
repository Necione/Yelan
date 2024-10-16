import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { Message, SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    syncStats,
    updateUserStats,
} from "../../services";
import { locked } from "../../utils";
import { handleAbyssChest } from "./abyssHelpers/abyssChest";
import { floor1Map } from "./abyssHelpers/floor1map";
import { handleAbyssBattle } from "./handlers/abyssHandler";

const directions = {
    up: { dx: 0, dy: 1 },
    down: { dx: 0, dy: -1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
};

const ambienceMessages = [
    "You hear distant echoes of dripping water.",
    "The ground beneath your feet feels unsteady.",
    "You hear the soft scurrying of something small...",
    "A faint light flickers in the distance.",
    "You feel a presence watching you.",
    "You hear faint footsteps...",
    "A gust of wind blows through the abyss.",
    "You hear a deep, low rumbling sound.",
    "Your footsteps echo unnaturally.",
];

function getRandomAmbience(): string {
    return ambienceMessages[
        Math.floor(Math.random() * ambienceMessages.length)
    ];
}

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

export const move = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("move")
        .setDescription("[RPG] Move in a direction within the Abyss.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("direction")
                .setDescription("The direction to move in")
                .setRequired(true)
                .addChoices(
                    { name: "Up", value: "up" },
                    { name: "Down", value: "down" },
                    { name: "Left", value: "left" },
                    { name: "Right", value: "right" },
                ),
        ),
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);

        if (!i.deferred) {
            locked.del(i.user.id);
            return;
        }

        const direction = i.options.getString("direction", true).toLowerCase();

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

        let newX = currentX;
        let newY = currentY;

        console.log(`Current Position: (${currentX}, ${currentY})`);

        switch (direction) {
            case "up":
                newY += 1;
                break;
            case "down":
                newY -= 1;
                break;
            case "left":
                newX -= 1;
                break;
            case "right":
                newX += 1;
                break;
            default:
                locked.del(i.user.id);
                return i.editReply(embedComment("Invalid direction."));
        }

        console.log(`Attempting to move ${direction} to: (${newX}, ${newY})`);

        if (
            newX < 0 ||
            newX >= floor1Map[0].length ||
            newY < 0 ||
            newY >= floor1Map.length
        ) {
            locked.del(i.user.id);
            return i.editReply(
                embedComment("You cannot move outside the map!"),
            );
        }

        const rowIndex = floor1Map.length - 1 - newY;
        const cell = floor1Map[rowIndex][newX].toLowerCase();

        console.log(
            `Accessing Map Cell at rowIndex: ${rowIndex}, x: ${newX} with cell: '${cell}'`,
        );

        if (cell === "w") {
            locked.del(i.user.id);
            return i.editReply(
                embedComment(
                    "You hit a wall and cannot move in that direction.",
                ),
            );
        } else if (cell === "d" && !stats.hasKey) {
            locked.del(i.user.id);
            return i.editReply(
                embedComment("You need a key to open this door."),
            );
        } else {
            await updateUserStats(i.user.id, {
                abyssCoordX: newX,
                abyssCoordY: newY,
            });

            let message = `Moved **${direction}** to position \`[${newX}, ${newY}]\``;

            if (cell === "c") {
                message += "\nOoohh shiny! You found treasure.";
                await handleAbyssChest(i, stats, newX, newY);
                locked.del(i.user.id);
                return;
            } else if (cell === "f") {
                message +=
                    "\nThere's a massive stairway that goes down to the Second Floor. However, you're unable to go there yet :(";
                locked.del(i.user.id);
            } else if (cell === "k") {
                if (!stats.hasKey) {
                    await updateUserStats(i.user.id, { hasKey: true });
                    message += "\nYou found an old, rusted key.";
                } else {
                    message += "\nYou've already collected this key.";
                }
            }

            const ambienceMessage = getRandomAmbience();
            message += `\n\n*${ambienceMessage}*`;

            const availableDirections = getAvailableDirections(
                newX,
                newY,
                floor1Map,
            );
            if (availableDirections.length > 0) {
                const directionsList = availableDirections.join(", ");
                message += `\n**Available Moves:** ${directionsList}.`;
            } else {
                message +=
                    "\nThere are no available directions to move from here.";
            }

            await i.editReply(embedComment(message, "Green"));

            const reply = await i.fetchReply();

            if (!reply || !(reply instanceof Message)) {
                locked.del(i.user.id);
                return i.editReply(
                    embedComment("Unable to fetch the reply message."),
                );
            }

            if (Math.random() < 0.5) {
                locked.set(i.user);

                if (!i.deferred) {
                    return;
                }

                const message = await i.fetchReply().catch(noop);
                if (!message) {
                    locked.del(i.user.id);
                    return r.edit(
                        embedComment("Unable to fetch the original message."),
                    );
                }

                const userWallet = await getProfileByUserId(i.user.id);
                if (!userWallet) {
                    locked.del(i.user.id);
                    return r.edit(
                        embedComment(
                            "Unable to find/create your user profile.",
                        ),
                    );
                }

                const syncedStats = await syncStats(i.user.id);
                if (!syncedStats) {
                    locked.del(i.user.id);
                    return r.edit(
                        embedComment(
                            "No stats found for you, please set up your profile.",
                        ),
                    );
                }

                if (syncedStats.isTravelling) {
                    locked.del(i.user.id);
                    return r.edit(
                        embedComment(
                            "You cannot go on a hunt while you are travelling!",
                        ),
                    );
                }

                if (syncedStats.hp <= 0) {
                    locked.del(i.user.id);
                    return r.edit(
                        embedComment(
                            "You don't have enough HP to go on a hunt :(",
                        ),
                    );
                }

                await updateUserStats(i.user.id, { isHunting: true });
                await handleAbyssBattle(i, message, syncedStats, userWallet);

                locked.del(i.user.id);
            } else {
                locked.del(i.user.id);
            }
        }
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
