import { type MonsterGroup } from "./groups";
import { locationGroupWeights } from "./locationGroupWeights";

export function getCommonLocationsForGroup(
    group: MonsterGroup,
    topN: number = 3,
): string[] {
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
