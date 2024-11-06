import { formatChange } from "./hunt";
import type {
    ArtifactName,
    ArtifactSetName,
    ArtifactType,
} from "./rpgitems/artifacts";
import { artifacts, artifactSets } from "./rpgitems/artifacts";

export function calculateStatChanges(
    beforeStats: any,
    afterStats: any,
): string[] {
    const updatedStats: string[] = [];

    const statsToCheck = [
        { key: "attackPower", label: "⚔️ Attack Power" },
        { key: "critChance", label: "🎯 Crit Rate", isPercentage: true },
        { key: "critValue", label: "💥 Crit Value", isMultiplier: true },
        { key: "maxHP", label: "❤️ Max HP" },
        { key: "defChance", label: "🛡️ DEF Rate", isPercentage: true },
        { key: "defValue", label: "🛡️ DEF Value" },
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

    const allSetNames = new Set([
        ...Object.keys(beforeSets),
        ...Object.keys(afterSets),
    ]);

    for (const setName of allSetNames) {
        const beforeCount = beforeSets[setName] || 0;
        const afterCount = afterSets[setName] || 0;

        const thresholds = [2, 4];
        for (const threshold of thresholds) {
            const hadBonus = beforeCount >= threshold;
            const hasBonus = afterCount >= threshold;

            if (
                (action === "activated" && hasBonus && !hadBonus) ||
                (action === "deactivated" && !hasBonus && hadBonus)
            ) {
                const bonusType = `${threshold}pc` as "2pc" | "4pc";
                const verb =
                    action === "activated" ? "Activated" : "Deactivated";
                messages.push(
                    `\n${verb} ${threshold}-piece set bonus: **${setName}**`,
                );
                if (action === "activated") {
                    messages.push(describeSetBonus(setName, bonusType));
                }
            }
        }
    }

    return messages;
}

function getActivatedSets(stats: any): { [setName: string]: number } {
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

    return setCounts;
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
                    `💥 Crit Value increased by ${(value * 100).toFixed(2)}%`,
                );
                break;
            case "maxHPPercentage":
                descriptions.push(
                    `❤️ Max HP increased by ${(value * 100).toFixed(2)}%`,
                );
                break;
            case "defChance":
                descriptions.push(`🛡️ DEF Rate increased by ${value}%`);
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
