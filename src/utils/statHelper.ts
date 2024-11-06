export function getHpScaleMultiplier(worldLevel: number) {
    if (worldLevel < 1) {
        return 1;
    }
    let total = 0;
    let x = 1;
    let z = 5;

    for (let level = 1; level <= worldLevel; level++) {
        total += x;
        if (level % 5 === 0) {
            total += z;
            x += 0.5;
            z += 5;
        }
    }
    return total;
}

export function getAtkScaleMultiplier(worldLevel: number) {
    if (worldLevel < 1) {
        return 1;
    }
    let total = 0;
    let x = 1;
    let z = 1;

    for (let level = 1; level <= worldLevel; level++) {
        total += x;
        if (level % 5 === 0) {
            total += z;
            x += 0.25;
            z += 1;
        }
    }
    return total;
}
