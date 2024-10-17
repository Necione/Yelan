import { embedComment } from "@elara-services/utils";
import { ChatInputCommandInteraction } from "discord.js";
import { updateUserStats } from "../../../services";

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
        y?: number
    ) => { x: number; y: number } | null
): Promise<{ newX: number; newY: number, transitionMessage: string } | null> {
    const newMap = floorMaps[newFloor];
    if (!newMap) {
        await i.editReply(
            embedComment(
                `Floor **${newFloor}** does not exist. You cannot ${direction} further.`,
                "Red"
            )
        );
        return null;
    }

    const targetCell = direction === "descend" ? "s" : "f";
    const startingPosition = findPositionInMap(newMap, targetCell, currentX, currentY);

    if (!startingPosition) {
        await i.editReply(
            embedComment(
                `Starting position (${targetCell}) not found on Floor **${newFloor}**.`,
                "Red"
            )
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

