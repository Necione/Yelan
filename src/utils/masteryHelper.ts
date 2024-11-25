export function toRoman(num: number): string {
    const lookup: { [key: number]: string } = {
        1: "I",
        2: "II",
        3: "III",
        4: "IV",
        5: "V",
        6: "VI",
        7: "VII",
        8: "VIII",
        9: "IX",
        10: "X",
    };
    return lookup[num] || num.toString();
}

export function calculateMasteryLevel(points: number): {
    level: string;
    numericLevel: number;
    remaining: number;
    nextLevel: number;
} {
    let level = 0;
    let requiredPoints = 10;

    while (points >= requiredPoints && level < 10) {
        points -= requiredPoints;
        level++;
        requiredPoints = Math.ceil(requiredPoints * 2);
    }

    return {
        level: level === 0 ? "No Mastery" : `Mastery ${toRoman(level)}`,
        numericLevel: level,
        remaining: points,
        nextLevel: level === 10 ? 0 : requiredPoints,
    };
}
