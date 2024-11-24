import { get, noop } from "@elara-services/utils";
import type { UserStats, UserWallet } from "@prisma/client";
import type { ChatInputCommandInteraction, ThreadChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { skills } from "../../../plugins/other/utils";
import {
    addBalance,
    addItemToInventory,
    updateUserStats,
} from "../../../services";
import { cooldowns, texts } from "../../../utils";
import { calculateDrop, calculateExp, type Monster } from "../../../utils/hunt";
import { weapons, type WeaponName } from "../../../utils/rpgitems/weapons";
import { getUserSkillLevelData } from "../../../utils/skillsData";
import {
    getAvailableDirections,
    getCurrentMap,
} from "../abyssHelpers/directionHelper";

const maxWorldLevel = 30;

export async function handleVictory(
    i: ChatInputCommandInteraction,
    thread: ThreadChannel,
    stats: UserStats,
    monstersEncountered: Monster[],
    currentPlayerHp: number,
    userWallet: UserWallet,
) {
    const finalEmbed = new EmbedBuilder();
    let totalExpGained = 0;
    let dropsCollected: { item: string; amount: number }[] = [];

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
        const expGained = calculateExp(monster.minExp, monster.maxExp);
        totalExpGained += expGained;

        const drops = calculateDrop(monster.drops);
        if (Array.isArray(drops)) {
            dropsCollected = dropsCollected.concat(drops);
            await addItemToInventory(i.user.id, drops);
        }
    }

    const numberOfMonsters = monstersEncountered.length;
    const xpReductionFactor = Math.max(0, 1 - (numberOfMonsters - 1) * 0.25);

    totalExpGained = Math.round(totalExpGained * xpReductionFactor);

    const hasGrowthSkill = skills.has(stats, "Growth");

    if (hasGrowthSkill) {
        totalExpGained = Math.round(totalExpGained * 1.5);
        skillsActivated += `\`🌱\` Growth skill activated! You earned 1.5x EXP.\n`;
    }

    let newExp = stats.exp + totalExpGained;
    let expRequired = 20 * Math.pow(1.2, stats.worldLevel - 1);

    while (newExp >= expRequired && stats.worldLevel < maxWorldLevel) {
        newExp -= expRequired;
        stats.worldLevel += 1;
        expRequired = 20 * Math.pow(1.2, stats.worldLevel - 1);
    }

    if (stats.worldLevel >= maxWorldLevel) {
        newExp = 0;
        finalEmbed.setDescription(
            `You've hit the max world level for this patch (${maxWorldLevel}) and cannot progress any further.`,
        );
    }

    await updateUserStats(i.user.id, {
        exp: newExp,
        worldLevel: stats.worldLevel,
    });

    const monstersFought = monstersEncountered
        .map((monster) => monster.name)
        .join(", ");

    finalEmbed
        .setColor("Green")
        .setTitle(`Victory in ${stats.location}!`)
        .setDescription(
            `You defeated the following monsters:\n\`${monstersFought}\`!\n-# \`⭐\` \`+${totalExpGained} EXP\` (\`🌍\` WL${stats.worldLevel})`,
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

        if (equippedWeapon && equippedWeapon.type === "Catalyst") {
            const manaRestored = Math.floor(Math.random() * 11) + 5;
            const newMana = Math.min(stats.mana + manaRestored, stats.maxMana);
            stats.mana = newMana;

            finalEmbed.addFields({
                name: "Mana Restored",
                value: `\`✨\` Restored \`${manaRestored}\` Mana`,
            });

            manaFieldAdded = true;
        }
    }

    await updateUserStats(i.user.id, {
        hp: currentPlayerHp,
        ...(manaFieldAdded && { mana: stats.mana }),
        activeEffects: stats.activeEffects,
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

        await i.editReply({ embeds: [finalEmbed] }).catch(noop);

        await thread.edit({ archived: true, locked: true }).catch(noop);

        await updateUserStats(i.user.id, {
            hp: 0,
            isHunting: false,
        });

        return;
    }

    const hasScroungeSkill = skills.has(stats, "Scrounge");

    if (hasScroungeSkill) {
        const coinsEarned = Math.floor(Math.random() * (10 - 5 + 1)) + 5;

        await addBalance(
            i.user.id,
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

    if (dropsCollected.length > 0) {
        const dropsDescription = dropsCollected
            .map((drop) => `\`${drop.amount}x\` ${drop.item}`)
            .join(", ");
        finalEmbed.addFields({
            name: "Drops",
            value: dropsDescription,
        });
    }

    await i.editReply({ embeds: [finalEmbed] }).catch(noop);

    await updateUserStats(i.user.id, { isHunting: false });
    await thread.edit({ archived: true, locked: true }).catch(noop);

    const insomniaSkill = getUserSkillLevelData(stats, "Insomnia");

    const huntCooldown = insomniaSkill?.levelData?.cooldown
        ? get.mins(insomniaSkill.levelData.cooldown)
        : get.mins(30);
    await cooldowns.set(userWallet, "hunt", huntCooldown);
}

export async function handleAbyssVictory(
    i: ChatInputCommandInteraction,
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
        hp: currentPlayerHp,
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

    let availableDirections: string[] = [];

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
    await updateUserStats(i.user.id, { isHunting: false });

    await thread.edit({ archived: true, locked: true }).catch(noop);
}
export async function handleDefeat(
    i: ChatInputCommandInteraction,
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
            `Oh no :( You were defeated by the **${monster.name}**...\n-# Use </downgrade:1282035993242767450> if this WL is too hard.`,
        );

    await updateUserStats(i.user.id, {
        hp: Math.max(currentPlayerHp, 0),
        isHunting: false,
    });

    await i.editReply({ embeds: [finalEmbed] }).catch(noop);

    const insomniaSkill = getUserSkillLevelData(stats, "Insomnia");

    const huntCooldown = insomniaSkill?.levelData?.cooldown
        ? get.mins(insomniaSkill.levelData.cooldown)
        : get.mins(30);

    await cooldowns.set(userWallet, "hunt", huntCooldown);

    await thread.edit({ archived: true, locked: true }).catch(noop);
}

export async function handleAbyssDefeat(
    i: ChatInputCommandInteraction,
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
        hp: Math.max(currentPlayerHp, 0),
        isHunting: false,
    });

    await i.editReply({ embeds: [finalEmbed] }).catch(noop);
    await thread.edit({ archived: true, locked: true }).catch(noop);
}
