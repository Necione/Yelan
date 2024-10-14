import { formatChange } from "./hunt";
import { ArtifactName, artifacts, ArtifactSetName, artifactSets, ArtifactType } from "./rpgitems/artifacts";

export function calculateStatChanges(beforeStats: any, afterStats: any): string[] {
    const updatedStats: string[] = [];

    const statsToCheck = [
        { key: "attackPower", label: "⚔️ Attack Power" },
        { key: "critChance", label: "🎯 Crit Rate", isPercentage: true },
        { key: "critValue", label: "💥 Crit Damage", isMultiplier: true },
        { key: "maxHP", label: "❤️ Max HP" },
        { key: "defChance", label: "🛡️ Def Chance", isPercentage: true },
        { key: "defValue", label: "🛡️ Def Value", isPercentage: true },
    ];

    for (const stat of statsToCheck) {
        const beforeValue = beforeStats[stat.key] || 0;
        const afterValue = afterStats[stat.key] || 0;
        const change = afterValue - beforeValue;

        if (change !== 0) {
            let formattedChange = formatChange(change);
            let totalValue = afterValue;
            if (stat.isPercentage) {
                formattedChange += "%";
                totalValue = totalValue.toFixed(2) + "%";
            } else if (stat.isMultiplier) {
                formattedChange += "x";
                totalValue = totalValue.toFixed(2) + "x";
            } else {
                totalValue = totalValue.toFixed(2);
            }
            updatedStats.push(
                `${stat.label}: ${formattedChange} (Total: ${totalValue})`,
            );
        }
    }

    return updatedStats;
}

export function getSetBonusMessages(
    beforeStats: any,
    afterStats: any,
    action: "activated" | "deactivated",
): string[] {
    const messages: string[] = [];
    const beforeSets = getActivatedSets(beforeStats);
    const afterSets = getActivatedSets(afterStats);

    const differenceSets =
        action === "activated"
            ? afterSets.filter((set) => !beforeSets.includes(set))
            : beforeSets.filter((set) => !afterSets.includes(set));

    for (const setName of differenceSets) {
        const setBonuses = artifactSets[setName as ArtifactSetName];
        if (setBonuses) {
            const pieceCounts = action === "activated" ? [2, 4] : [4, 2];
            for (const count of pieceCounts) {
                const hadBonus = hasSetPieces(beforeStats, setName, count);
                const hasBonus = hasSetPieces(afterStats, setName, count);

                if (
                    (action === "activated" && hasBonus && !hadBonus) ||
                    (action === "deactivated" && !hasBonus && hadBonus)
                ) {
                    const bonusType = `${count}pc` as "2pc" | "4pc";
                    const verb =
                        action === "activated" ? "Activated" : "Deactivated";
                    messages.push(
                        `\n${verb} ${count}-piece set bonus: **${setName}**`,
                    );
                    if (action === "activated") {
                        messages.push(describeSetBonus(setName, bonusType));
                    }
                }
            }
        }
    }

    return messages;
}

function getActivatedSets(stats: any): string[] {
    const artifactTypes: ArtifactType[] = [
        "Flower",
        "Plume",
        "Sands",
        "Goblet",
        "Circlet",
    ];
    const setCounts: { [setName: string]: number } = {};

    for (const type of artifactTypes) {
        const field = `equipped${type}` as keyof typeof stats;
        const artifactName = stats[field];
        if (artifactName && artifacts[artifactName as ArtifactName]) {
            const artifact = artifacts[artifactName as ArtifactName];
            const setName = artifact.artifactSet;
            setCounts[setName] = (setCounts[setName] || 0) + 1;
        }
    }

    return Object.keys(setCounts).filter((setName) => setCounts[setName] >= 2);
}

function hasSetPieces(stats: any, setName: string, pieces: number): boolean {
    const artifactTypes: ArtifactType[] = [
        "Flower",
        "Plume",
        "Sands",
        "Goblet",
        "Circlet",
    ];
    let count = 0;
    for (const type of artifactTypes) {
        const field = `equipped${type}` as keyof typeof stats;
        const artifactName = stats[field];
        if (artifactName && artifacts[artifactName as ArtifactName]) {
            const artifact = artifacts[artifactName as ArtifactName];
            if (artifact.artifactSet === setName) {
                count++;
            }
        }
    }
    return count >= pieces;
}

function describeSetBonus(setName: string, bonusType: "2pc" | "4pc"): string {
    const setBonuses = artifactSets[setName as ArtifactSetName];
    if (!setBonuses || !setBonuses[bonusType]) {
        return "";
    }
    const bonuses = setBonuses[bonusType];
    const descriptions: string[] = [];
    for (const [key, value] of Object.entries(bonuses)) {
        switch (key) {
            case "attackPowerPercentage":
                descriptions.push(
                    `⚔️ Attack Power increased by ${(value * 100).toFixed(2)}%`,
                );
                break;
            case "critChance":
                descriptions.push(`🎯 Crit Rate increased by ${value}%`);
                break;
            case "critValuePercentage":
                descriptions.push(
                    `💥 Crit Damage increased by ${(value * 100).toFixed(2)}%`,
                );
                break;
            case "maxHPPercentage":
                descriptions.push(
                    `❤️ Max HP increased by ${(value * 100).toFixed(2)}%`,
                );
                break;
            case "defChance":
                descriptions.push(`🛡️ DEF Chance increased by ${value}%`);
                break;
            case "defValuePercentage":
                descriptions.push(
                    `🛡️ DEF Value increased by ${(value * 100).toFixed(2)}%`,
                );
                break;
            case "healEffectiveness":
                descriptions.push(
                    `💖 Healing effectiveness increased by ${(
                        value * 100
                    ).toFixed(2)}%`,
                );
                break;
            default:
                break;
        }
    }
    return descriptions.join("\n");
}
