import { floor1Map } from "./floor1map";
import { floor2Map } from "./floor2map";

const floorMaps: { [key: number]: string[][] } = {
    1: floor1Map,
    2: floor2Map,
};

const directions = {
    up: { dx: 0, dy: 1 },
    down: { dx: 0, dy: -1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
};

export function getAvailableDirections(
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

export function getCurrentMap(floor: number): string[][] | null {
    return floorMaps[floor] || null;
}

// abyssHelpers/findPosition.ts

/**
 * Finds the position of a target cell in the map.
 *
 * @param map - The current floor's map.
 * @param target - The target cell to find (e.g., "s" for start, "f" for floor transition).
 * @param x - Optional X coordinate to match.
 * @param y - Optional Y coordinate to match.
 * @returns The coordinates { x, y } if found, otherwise null.
 */
export function findPositionInMap(
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
