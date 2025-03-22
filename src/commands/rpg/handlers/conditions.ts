import { get, getRandomValue, make, noop } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type { Message, ThreadChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { skills } from "../../../plugins/other/utils";
import {
    addBalance,
    addItemToInventory,
    updateUserStats,
} from "../../../services";
import { cooldowns, texts } from "../../../utils";
import { calculateDrop, type Monster } from "../../../utils/helpers/huntHelper";
import { calculateMasteryLevel } from "../../../utils/helpers/masteryHelper";
import { weapons, type WeaponName } from "../../../utils/rpgitems/weapons";
import { getUserSkillLevelData } from "../../../utils/skillsData";
import {
    getAvailableDirections,
    getCurrentMap,
} from "../abyssHelpers/directionHelper";
import type { AnyInteraction } from "./huntHandler";

export type ItemDrop = {
    item: string;
    amount: number;
};

const maxadventureRank = 35;

export async function handleVictory(
    message: Message,
    thread: ThreadChannel,
    stats: UserStats,
    monstersEncountered: Monster[],
    currentPlayerHp: number,
    userWallet: UserWallet,
) {
    const finalEmbed = new EmbedBuilder();
    let totalExpGained = 0;
    let dropsCollected = make.array<ItemDrop>();
    let inventoryFull = false;

    let skillsActivated = "";
    let effectsActivated = "";

    for (const effect of stats.activeEffects) {
        if (effect.remainingUses > 0) {
            if (effect.name === "Regeneration") {
                const healAmount = Math.ceil(stats.maxHP * effect.effectValue);
                currentPlayerHp = Math.min(
                    currentPlayerHp + healAmount,
                    stats.maxHP,
                );
                effectsActivated += `\`🩹\` Regeneration effect healed you for \`${healAmount}\` HP. (${
                    effect.remainingUses - 1
                } uses left)\n`;
            } else if (effect.name === "Poisoning") {
                const damageAmount = Math.ceil(
                    stats.maxHP * Math.abs(effect.effectValue),
                );
                currentPlayerHp = Math.max(currentPlayerHp - damageAmount, 0);
                effectsActivated += `\`☠️\` Poisoning effect damaged you for \`${damageAmount}\` HP. (${
                    effect.remainingUses - 1
                } uses left)\n`;
            }

            effect.remainingUses -= 1;
        }
    }

    stats.activeEffects = stats.activeEffects.filter(
        (effect) => effect.remainingUses > 0,
    );

    for (const monster of monstersEncountered) {
        const expGained = getRandomValue(monster.minExp, monster.maxExp);
        totalExpGained += expGained;

        const drops = calculateDrop(monster.drops);
        if (Array.isArray(drops) && !inventoryFull) {
            try {
                const success = await addItemToInventory(stats.userId, drops);
                if (!success) {
                    inventoryFull = true;
                } else {
                    dropsCollected = dropsCollected.concat(drops);
                }
            } catch (error) {
                inventoryFull = true;
            }
        }
    }

    const numberOfMonsters = monstersEncountered.length;
    const xpReductionFactor = Math.max(0, 1 - (numberOfMonsters - 1) * 0.25);

    totalExpGained = Math.round(totalExpGained * xpReductionFactor);

    const hasGrowthSkill = skills.has(stats, "Growth");

    if (hasGrowthSkill) {
        totalExpGained = Math.round(totalExpGained * 1.5);
        skillsActivated += `\`🌱\` Growth skill activated! You earned \`1.5x EXP\`.\n`;
    }

    let newExp = stats.exp + totalExpGained;
    let expRequired = 20 * Math.pow(1.2, stats.adventureRank - 1);

    while (newExp >= expRequired && stats.adventureRank < maxadventureRank) {
        newExp -= expRequired;
        stats.adventureRank += 1;
        expRequired = 20 * Math.pow(1.2, stats.adventureRank - 1);
    }

    if (stats.adventureRank >= maxadventureRank) {
        newExp = 0;
        finalEmbed.setDescription(
            `You've hit the max Adventure Rank for this patch (${maxadventureRank}) and cannot progress any further.`,
        );
    }

    await updateUserStats(stats.userId, {
        exp: { set: newExp },
        adventureRank: { set: stats.adventureRank },
    });

    const monstersFought = monstersEncountered
        .map((monster) => monster.name)
        .join(", ");

    finalEmbed
        .setColor("Green")
        .setTitle(`Victory in ${stats.location}!`)
        .setDescription(
            `You defeated the following monsters:\n\`${monstersFought}\`!\n-# \`⭐\` \`+${totalExpGained} EXP\` (\`🌍\` AR${stats.adventureRank})`,
        )
        .setThumbnail(
            monstersEncountered[monstersEncountered.length - 1].image,
        );

    const totemLevelData = getUserSkillLevelData(stats, "Totem");

    if (totemLevelData) {
        const levelData = totemLevelData.levelData || {};
        const healPercentage = levelData.healPercentage || 0;
        const healAmount = Math.ceil(stats.maxHP * healPercentage);
        currentPlayerHp = Math.min(currentPlayerHp + healAmount, stats.maxHP);

        skillsActivated += `\`💖\` Healed \`${healAmount}\` HP due to the Totem skill.\n`;
    }

    let manaFieldAdded = false;

    if (stats.equippedWeapon) {
        const weaponName = stats.equippedWeapon as WeaponName;
        const equippedWeapon = weapons[weaponName];

        if (equippedWeapon) {
            switch (equippedWeapon.type) {
                case "Sword":
                    stats.masterySword += 1;
                    break;
                case "Claymore":
                    stats.masteryClaymore += 1;
                    break;
                case "Bow":
                    stats.masteryBow += 1;
                    break;
                case "Polearm":
                    stats.masteryPolearm += 1;
                    break;
                case "Catalyst":
                    stats.masteryCatalyst += 1;
                    break;
                case "Rod":
                    stats.masteryRod += 1;
                    break;
                default:
                    break;
            }
        }

        if (equippedWeapon && equippedWeapon.type === "Catalyst") {
            const catalystMasteryPoints = stats.masteryCatalyst || 0;
            const { numericLevel } = calculateMasteryLevel(
                catalystMasteryPoints,
            );

            let minPercent = 0.25;
            let maxPercent = 0.5;

            if (numericLevel >= 4) {
                minPercent = 0.5;
                maxPercent = 0.75;
            }

            const randomPercent =
                Math.random() * (maxPercent - minPercent) + minPercent;
            const manaRestored = Math.floor(stats.maxMana * randomPercent);

            const newMana = Math.min(stats.mana + manaRestored, stats.maxMana);
            stats.mana = newMana;

            finalEmbed.addFields({
                name: "Mana Restored",
                value: `\`✨\` Restored \`${manaRestored}\` Mana (${Math.round(
                    randomPercent * 100,
                )}%)`,
            });

            manaFieldAdded = true;
        }
    }

    await updateUserStats(stats.userId, {
        hp: { set: currentPlayerHp },
        ...(manaFieldAdded && { mana: { set: stats.mana } }),
        activeEffects: { set: stats.activeEffects },
        masterySword: { set: stats.masterySword },
        masteryClaymore: { set: stats.masteryClaymore },
        masteryBow: { set: stats.masteryBow },
        masteryPolearm: { set: stats.masteryPolearm },
        masteryCatalyst: { set: stats.masteryCatalyst },
        masteryRod: { set: stats.masteryRod },
    });

    if (effectsActivated) {
        finalEmbed.addFields({
            name: "Effects Applied",
            value: effectsActivated,
        });
    }

    if (currentPlayerHp <= 0) {
        finalEmbed.setColor("Red");
        finalEmbed.setTitle("Defeat after Victory...");
        finalEmbed.setDescription(
            `You defeated the monsters but succumbed to poisoning afterwards...`,
        );

        await message.edit({ embeds: [finalEmbed] }).catch(noop);

        await thread.edit({ archived: true, locked: true }).catch(noop);

        await updateUserStats(stats.userId, {
            hp: { set: 0 },
            isHunting: { set: false },
        });

        return;
    }

    const hasScroungeSkill = skills.has(stats, "Scrounge");

    if (hasScroungeSkill) {
        const coinsEarned = Math.floor(Math.random() * (10 - 5 + 1)) + 5;

        await addBalance(
            stats.userId,
            coinsEarned,
            true,
            `Earned from the Scrounge skill`,
        );

        skillsActivated += `\`💸\` Earned \`${coinsEarned}\` ${texts.c.u} with the Scrounge skill.\n`;
    }

    if (skillsActivated) {
        finalEmbed.addFields({
            name: "Skills Activated",
            value: skillsActivated,
        });
    }

    if (inventoryFull) {
        finalEmbed.addFields({
            name: "Drops",
            value: "Your inventory is full, please sell some items to make space.",
        });
    } else if (dropsCollected.length > 0) {
        const dropsDescription = dropsCollected
            .map((drop) => `\`${drop.amount}x\` ${drop.item}`)
            .join(", ");
        finalEmbed.addFields({
            name: "Drops",
            value: dropsDescription,
        });
    }

    await message.edit({ embeds: [finalEmbed] }).catch(noop);

    await updateUserStats(stats.userId, { isHunting: { set: false } });
    await thread.edit({ archived: true, locked: true }).catch(noop);

    const insomniaSkill = getUserSkillLevelData(stats, "Insomnia");

    const huntCooldown = insomniaSkill?.levelData?.cooldown
        ? get.mins(insomniaSkill.levelData.cooldown)
        : get.mins(30);
    await cooldowns.set(userWallet, "hunt", huntCooldown);
}

export async function handleAbyssVictory(
    i: AnyInteraction,
    thread: ThreadChannel,
    stats: UserStats,
    monstersEncountered: Monster[],
    currentPlayerHp: number,
) {
    const finalEmbed = new EmbedBuilder();

    let skillsActivated = "";

    const monstersFought = monstersEncountered
        .map((monster) => monster.name)
        .join(", ");

    finalEmbed
        .setColor("#b84df1")
        .setTitle(`Victory in The Abyss!`)
        .setDescription(
            `You defeated the following monsters:\n\`${monstersFought}\`!`,
        )
        .setThumbnail(
            monstersEncountered[monstersEncountered.length - 1].image,
        );

    const totemLevelData = getUserSkillLevelData(stats, "Totem");

    if (totemLevelData) {
        const levelData = totemLevelData.levelData || {};
        const healPercentage = levelData.healPercentage || 0;
        const healAmount = Math.ceil(stats.maxHP * healPercentage);
        currentPlayerHp = Math.min(currentPlayerHp + healAmount, stats.maxHP);

        skillsActivated += `\`💖\` Healed \`${healAmount}\` HP due to the Totem skill.\n`;
    }

    await updateUserStats(i.user.id, {
        hp: { set: currentPlayerHp },
    });

    if (skillsActivated) {
        finalEmbed.addFields({
            name: "Skills Activated",
            value: skillsActivated,
        });
    }

    const currentX = stats.abyssCoordX;
    const currentY = stats.abyssCoordY;
    const currentFloor = stats.currentAbyssFloor;

    const currentMap = getCurrentMap(currentFloor);

    let availableDirections = make.array<string>();

    if (currentMap) {
        if (currentX !== null && currentY !== null) {
            availableDirections = getAvailableDirections(
                currentX,
                currentY,
                currentMap,
            );
            const directionsList =
                availableDirections.length > 0
                    ? availableDirections.join(", ")
                    : "No available moves from here.";

            finalEmbed.addFields(
                {
                    name: "Current Location",
                    value: `\`[${currentX}, ${currentY}]\` on Floor **${currentFloor}**`,
                },
                {
                    name: "Available Moves",
                    value: directionsList,
                },
            );
        } else {
            finalEmbed.addFields({
                name: "Error",
                value: "Current coordinates are not set.",
            });
        }
    } else {
        finalEmbed.addFields({
            name: "Error",
            value: "Could not retrieve the current map for available moves.",
        });
    }

    await i.editReply({ embeds: [finalEmbed] }).catch(noop);
    await updateUserStats(i.user.id, { isHunting: { set: false } });

    await thread.edit({ archived: true, locked: true }).catch(noop);
}
export async function handleDefeat(
    message: Message,
    thread: ThreadChannel,
    stats: UserStats,
    monster: Monster,
    currentPlayerHp: number,
    userWallet: UserWallet,
) {
    const finalEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle(`Defeat...`)
        .setDescription(
            `Oh no :( You were defeated by the **${monster.name}**...`,
        );

    await updateUserStats(stats.userId, {
        hp: { set: Math.max(currentPlayerHp, 0) },
        isHunting: { set: false },
    });

    await message.edit({ embeds: [finalEmbed] }).catch(noop);

    const insomniaSkill = getUserSkillLevelData(stats, "Insomnia");

    const huntCooldown = insomniaSkill?.levelData?.cooldown
        ? get.mins(insomniaSkill.levelData.cooldown)
        : get.mins(30);

    await cooldowns.set(userWallet, "hunt", huntCooldown);

    await thread.edit({ archived: true, locked: true }).catch(noop);
}

export async function handleAbyssDefeat(
    i: AnyInteraction,
    thread: ThreadChannel,
    monster: Monster,
    currentPlayerHp: number,
) {
    const finalEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle(`Defeat...`)
        .setDescription(
            `Oh no :( You were defeated by the **${monster.name}**...\n`,
        );

    await updateUserStats(i.user.id, {
        hp: { set: Math.max(currentPlayerHp, 0) },
        isHunting: { set: false },
    });

    await i.editReply({ embeds: [finalEmbed] }).catch(noop);
    await thread.edit({ archived: true, locked: true }).catch(noop);
}
