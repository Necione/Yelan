import type { FishData } from "../../../utils/rpgitems/fish";

export function calculateFishingLevel(
    currentLevel: number,
    timesFishedForLevel: number,
) {
    let requiredFishes = 5 * Math.pow(1.2, currentLevel - 1);
    requiredFishes = Math.round(requiredFishes);

    const levelUp = timesFishedForLevel >= requiredFishes;

    return { levelUp, requiredFishesForNextLevel: requiredFishes };
}

export function selectFishLength() {
    const fishLengths = [
        { length: 30, weight: 25 },
        { length: 60, weight: 20 },
        { length: 90, weight: 15 },
        { length: 120, weight: 12 },
        { length: 150, weight: 10 },
        { length: 180, weight: 7 },
        { length: 210, weight: 5 },
        { length: 240, weight: 3 },
        { length: 370, weight: 2 },
        { length: 400, weight: 1 },
    ];

    const totalWeight = fishLengths.reduce(
        (acc, lengthObj) => acc + lengthObj.weight,
        0,
    );
    let random = Math.random() * totalWeight;

    for (const lengthObj of fishLengths) {
        if (random < lengthObj.weight) {
            return lengthObj.length;
        }
        random -= lengthObj.weight;
    }

    return fishLengths[fishLengths.length - 1].length;
}

export function selectFish(
    fishArray: (FishData & { name: string })[],
): FishData & { name: string } {
    const totalWeight = fishArray.reduce((acc, fish) => acc + fish.weight, 0);
    let random = Math.random() * totalWeight;

    for (const fish of fishArray) {
        if (random < fish.weight) {
            return fish;
        }
        random -= fish.weight;
    }

    return fishArray[fishArray.length - 1];
}
