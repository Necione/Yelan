import { embedComment } from "@elara-services/utils";
import { type UserStats } from "@prisma/client";
import { type ChatInputCommandInteraction } from "discord.js";
import { updateUserStats } from "../../../services";
import { floorRequirements } from "./floorReq";

type TransitionDirection = "ascend" | "descend";

export async function handleFloorTransition(
    i: ChatInputCommandInteraction,
    direction: TransitionDirection,
    newFloor: number,
    currentX: number,
    currentY: number,
    floorMaps: { [key: number]: string[][] },
    findPositionInMap: (
        map: string[][],
        target: string,
        x?: number,
        y?: number,
    ) => { x: number; y: number } | null,
    stats: UserStats,
): Promise<{ newX: number; newY: number; transitionMessage: string } | null> {
    const newMap = floorMaps[newFloor];
    if (!newMap) {
        await i.editReply(
            embedComment(
                `You come across a massive stairwell with guards next to it. They say that floor **${newFloor}** is not open yet. You cannot ${direction} further.`,
                "Red",
            ),
        );
        return null;
    }

    if (direction === "descend" && newFloor > 1) {
        const requiredLevel = floorRequirements[newFloor] || 0;
        if (stats.worldLevel < requiredLevel) {
            await i.editReply(
                embedComment(
                    `You come across a massive stairwell with guards next to it. They say that you need to be at least **World Level ${requiredLevel}** to ${direction} to Floor **${newFloor}**.`,
                    "Red",
                ),
            );
            return null;
        }
    }

    const targetCell = direction === "descend" ? "s" : "f";
    const startingPosition = findPositionInMap(
        newMap,
        targetCell,
        currentX,
        currentY,
    );

    if (!startingPosition) {
        await i.editReply(
            embedComment(
                `Starting position (${targetCell}) not found on Floor **${newFloor}**.`,
                "Red",
            ),
        );
        return null;
    }

    const { x: newX, y: newY } = startingPosition;

    await updateUserStats(i.user.id, {
        currentAbyssFloor: newFloor,
        abyssCoordX: newX,
        abyssCoordY: newY,
    });

    const transitionMessage =
        direction === "descend"
            ? `You have descended to Floor **${newFloor}**.`
            : `You have ascended to Floor **${newFloor}**.`;

    return { newX, newY, transitionMessage };
}
