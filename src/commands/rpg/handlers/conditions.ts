import { get, noop } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import type { UserStats, UserWallet } from "@prisma/client";
import type { ChatInputCommandInteraction, ThreadChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import {
    addBalance,
    addItemToInventory,
    removeBalance,
    updateUserStats,
} from "../../../services";
import { cooldowns, texts } from "../../../utils";
import { calculateDrop, calculateExp, type Monster } from "../../../utils/hunt";

const maxWorldLevel = 25;

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

    const hasGrowthSkill =
        stats.skills.some((skill) => skill.name === "Growth") &&
        stats.activeSkills.includes("Growth");

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

    const hasTotemSkill =
        stats.skills.some((skill) => skill.name === "Totem") &&
        stats.activeSkills.includes("Totem");

    if (hasTotemSkill) {
        const healAmount = Math.ceil(stats.maxHP * 0.05);
        currentPlayerHp = Math.min(currentPlayerHp + healAmount, stats.maxHP);

        skillsActivated += `\`💖\` Healed \`${healAmount}\` HP due to the Totem skill.\n`;

        await updateUserStats(i.user.id, {
            hp: currentPlayerHp,
        });
    }

    const hasScroungeSkill =
        stats.skills.some((skill) => skill.name === "Scrounge") &&
        stats.activeSkills.includes("Scrounge");

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

    const hasInsomniaSkill =
        stats.skills.some((skill) => skill.name === "Insomnia") &&
        stats.activeSkills.includes("Insomnia");

    const huntCooldown = hasInsomniaSkill ? get.mins(20) : get.mins(30);
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

    const hasTotemSkill =
        stats.skills.some((skill) => skill.name === "Totem") &&
        stats.activeSkills.includes("Totem");

    if (hasTotemSkill) {
        const healAmount = Math.ceil(stats.maxHP * 0.05);
        currentPlayerHp = Math.min(currentPlayerHp + healAmount, stats.maxHP);

        skillsActivated += `\`💖\` Healed \`${healAmount}\` HP due to the Totem skill.\n`;

        await updateUserStats(i.user.id, {
            hp: currentPlayerHp,
        });
    }

    if (skillsActivated) {
        finalEmbed.addFields({
            name: "Skills Activated",
            value: skillsActivated,
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

    const rebirths = typeof stats.rebirths === "number" ? stats.rebirths : 0;

    const baseDeduction = 25;
    const additionalDeduction = 25 * rebirths;
    const totalDeduction = baseDeduction + additionalDeduction;

    const amountToDeduct = Math.min(totalDeduction);

    if (amountToDeduct > 0) {
        await removeBalance(
            i.user.id,
            amountToDeduct,
            true,
            `Lost due to defeat`,
        );

        finalEmbed.addFields({
            name: "Loss",
            value: `You lost ${customEmoji.a.z_coins} \`${amountToDeduct}\` ${texts.c.u} due to your defeat.`,
        });
    }

    await updateUserStats(i.user.id, {
        hp: Math.max(currentPlayerHp, 0),
        isHunting: false,
    });

    await i.editReply({ embeds: [finalEmbed] }).catch(noop);

    const hasInsomniaSkill =
        stats.skills.some((skill) => skill.name === "Insomnia") &&
        stats.activeSkills.includes("Insomnia");

    const huntCooldown = hasInsomniaSkill ? get.mins(20) : get.mins(30);
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