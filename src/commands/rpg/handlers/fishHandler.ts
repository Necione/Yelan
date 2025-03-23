import type { FishData } from "../../../utils/rpgitems/fish";

interface FishingLevelResult {
    levelUp: boolean;
    requiredExpForNextLevel: number;
    validLevel: boolean;
    correctLevel: number;
}

export function calculateFishingLevel(currentExp: number): FishingLevelResult {
    let level = 1;
    let expRequired = 100;
    let totalExpRequired = 100;

    while (currentExp >= totalExpRequired && level < 100) {
        level++;
        expRequired = Math.round(expRequired * 1.2);
        totalExpRequired += expRequired;
    }

    const expForNextLevel = totalExpRequired - currentExp;

    return {
        levelUp: false,
        requiredExpForNextLevel: expForNextLevel,
        validLevel: level > 0 && level <= 100,
        correctLevel: level,
    };
}

export function selectFishLength() {
    const fishLengths = [
        { length: 30, weight: 25 },
        { length: 60, weight: 20 },
        { length: 90, weight: 15 },
        { length: 120, weight: 12 },
        { length: 150, weight: 9 },
        { length: 180, weight: 7 },
        { length: 210, weight: 5 },
        { length: 240, weight: 4 },
        { length: 270, weight: 3 },
        { length: 300, weight: 2.5 },
        { length: 330, weight: 2 },
        { length: 360, weight: 1.5 },
        { length: 390, weight: 1.2 },
        { length: 420, weight: 1 },
        { length: 450, weight: 0.8 },
        { length: 480, weight: 0.6 },
        { length: 510, weight: 0.5 },
        { length: 540, weight: 0.3 },
        { length: 570, weight: 0.2 },
        { length: 600, weight: 0.1 },
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
