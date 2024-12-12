export function getHpScaleMultiplier(adventureRank: number) {
    if (adventureRank < 1) {
        return 1;
    }
    let total = 0;
    let x = 1;
    let z = 5;

    for (let level = 1; level <= adventureRank; level++) {
        total += x;
        if (level % 5 === 0) {
            total += z;
            x += 0.5;
            z += 5;
        }
    }
    return total;
}

export function getAtkScaleMultiplier(adventureRank: number) {
    if (adventureRank < 1) {
        return 1;
    }
    let total = 0;
    let x = 1;
    let z = 1;

    for (let level = 1; level <= adventureRank; level++) {
        total += x;
        if (level % 5 === 0) {
            total += z;
            x += 0.1;
            z += 0.25;
        }
    }
    return total;
}
