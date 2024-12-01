import { locationGroupWeights } from "./locationGroupWeights";
import { type MonsterGroup } from "./monsterHelper";

export function getCommonLocationsForGroup(group: MonsterGroup, topN = 3) {
    const locationsWithWeights = Object.entries(locationGroupWeights).reduce<
        { location: string; weight: number }[]
    >((acc, [location, groups]) => {
        const weight =
            groups[group] || locationGroupWeights["Default"]?.[group] || 1;
        acc.push({ location, weight });
        return acc;
    }, []);

    locationsWithWeights.sort((a, b) => b.weight - a.weight);

    return locationsWithWeights.slice(0, topN).map((lw) => lw.location);
}
