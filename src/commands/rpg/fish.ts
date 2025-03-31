import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import {
    awaitComponent,
    embedComment,
    get,
    getRandomValue,
    is,
    make,
    noop,
    shuffle,
    sleep,
    snowflakes,
} from "@elara-services/utils";
import type { Prisma, UserStats, UserStatsInv } from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import {
    addItemToInventory,
    getProfileByUserId,
    syncStats,
    updateUserStats,
} from "../../services";
import { cooldowns, locked } from "../../utils";
import { getRandomFishingMonster } from "../../utils/helpers/fishingHelper";
import { calculateDrop } from "../../utils/helpers/huntHelper";
import { type FishData, fishList } from "../../utils/rpgitems/fish";
import { type WeaponName, weapons } from "../../utils/rpgitems/weapons";
import { getUserSkillLevelData } from "../../utils/skillsData";
import {
    calculateFishingLevel,
    selectFish,
    selectFishLength,
} from "./handlers/fishHandler";
import { startFishingEncounter } from "./handlers/huntHandler";

const bait = make.array<string>([
    "Fruit Paste Bait",
    "Redrot Bait",
    "Sugardew Bait",
]);

async function finalizeFishing(
    userId: string,
    stats: UserStats,
    caughtFishDetails: Array<{
        selectedFish: FishData & { name: string };
        fishLength: number;
        exp: number;
    }>,
    cumulativeFishExp: number,
): Promise<{ embed: EmbedBuilder; updatedStats: UserStats }> {
    const initialFishingExp = stats.fishingExp;
    const initialFishingLevel = stats.fishingLevel;

    const newFishingExp = initialFishingExp + cumulativeFishExp;
    const { correctLevel, requiredExpForNextLevel } =
        calculateFishingLevel(newFishingExp);
    const levelsGained = correctLevel - initialFishingLevel;

    stats.fishingExp = newFishingExp;
    stats.fishingLevel = correctLevel;

    const updateData: Prisma.UserStatsUpdateInput = {
        fishingExp: { set: stats.fishingExp },
        fishingLevel: { set: stats.fishingLevel },
        timesFished: { set: stats.timesFished },
        longestFish: { set: stats.longestFish },
        lifetimeFishCaught: { set: stats.lifetimeFishCaught },
        inventory: { set: stats.inventory },
    };

    if (
        caughtFishDetails.some(
            (f) => f.selectedFish.rarity.toLowerCase() === "legendary",
        )
    ) {
        updateData.legendariesCaught = { set: stats.legendariesCaught };
    }
    const updatedStats = await updateUserStats(userId, updateData);
    if (!updatedStats) {
        throw new Error("Failed to update user stats.");
    }

    const caughtEmbed = new EmbedBuilder()
        .setTitle(`You caught ${caughtFishDetails.length} fish!`)
        .setColor("Aqua");

    caughtFishDetails.forEach((fish, index) => {
        caughtEmbed.addFields({
            name: `Fish ${index + 1}`,
            value:
                `\`${fish.selectedFish.rarity}\` **${fish.selectedFish.name}**\n` +
                `\`📏\` Length: **${fish.fishLength} cm**\n` +
                `\`✨\` Exp: **+${fish.exp}**`,
        });
    });

    if (levelsGained > 0) {
        caughtEmbed.addFields({
            name: "Fishing Level Up!",
            value: `\`🌟\` Congratulations! You reached Fishing Level ${stats.fishingLevel}!`,
        });
    }
    caughtEmbed.addFields({
        name: "Fishing Progress",
        value: `\`🎣\` Fishing Level: \`${stats.fishingLevel}\` (\`${
            stats.fishingExp
        }/${stats.fishingExp + requiredExpForNextLevel}\` Fishing EXP)`,
    });

    return { embed: caughtEmbed, updatedStats };
}

export const fishCommand = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("fish")
        .setDescription("[RPG] Go fishing to catch fish.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("bait")
                .setDescription("Select your bait for fishing.")
                .setRequired(true)
                .addChoices(bait.map((c) => ({ name: c, value: c }))),
        ),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);

        const user = await getProfileByUserId(i.user.id);
        if (!user) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to find/create your user profile."),
            );
        }

        const fishCooldown = cooldowns.get(user, "fish");
        if (!fishCooldown.status) {
            locked.del(i.user.id);
            return r.edit(embedComment(fishCooldown.message));
        }

        let stats = await syncStats(i.user.id);
        if (!stats) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "No stats found for you, please set up your profile.",
                ),
            );
        }

        if (!stats.equippedWeapon) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("You need to equip a fishing rod to fish!"),
            );
        }

        const equippedWeapon = weapons[stats.equippedWeapon as WeaponName];
        if (equippedWeapon?.type !== "Rod") {
            locked.del(i.user.id);
            return r.edit(
                embedComment("You need to equip a fishing rod to fish!"),
            );
        }

        if (stats.abyssMode) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "You cannot start a hunt while in The Spiral Abyss!",
                ),
            );
        }

        if (stats.hp <= 0) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "You don't have enough HP to go on a fishing trip!",
                ),
            );
        }

        const baitChoice = i.options.getString("bait", true);
        const baitItem = stats.inventory.find(
            (item) => item.item === baitChoice,
        );
        if (!baitItem || !is.number(baitItem.amount)) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    `You need \`1x\` **${baitChoice}** to fish.\nDiffuse any **Misc** item to obtain some!`,
                ),
            );
        }

        baitItem.amount -= 1;
        if (baitItem.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (item) => item.item !== baitItem.item,
            );
        }
        stats = await updateUserStats(i.user.id, {
            inventory: { set: stats.inventory },
        });
        if (!stats) {
            locked.del(i.user.id);
            return r.edit(embedComment(`Unable to update your stats.`));
        }

        let fishToCatch = 1;
        let requiresReel = true;
        if (baitChoice === "Redrot Bait") {
            fishToCatch = 2;
        } else if (baitChoice === "Sugardew Bait") {
            fishToCatch = 1;
            requiresReel = false;
        }

        const caughtFishDetails: Array<{
            selectedFish: FishData & { name: string };
            fishLength: number;
            exp: number;
        }> = [];
        let cumulativeFishExp = 0;

        const processCatch = (
            selectedFish: FishData & { name: string },
            fishLength: number,
        ) => {
            stats!.longestFish =
                fishLength > stats!.longestFish
                    ? fishLength
                    : stats!.longestFish;
            stats!.lifetimeFishCaught = (stats!.lifetimeFishCaught || 0) + 1;
            if (selectedFish.rarity.toLowerCase() === "legendary") {
                stats!.legendariesCaught = (stats!.legendariesCaught || 0) + 1;
            }
            const invItem = stats!.inventory.find(
                (c: UserStatsInv) =>
                    c.item === selectedFish.name &&
                    c.metadata &&
                    c.metadata.length === fishLength,
            );
            if (invItem) {
                invItem.amount++;
            } else {
                stats!.inventory.push({
                    id: snowflakes.generate(),
                    item: selectedFish.name,
                    amount: 1,
                    metadata: { length: fishLength, star: null },
                });
            }
            stats!.timesFished = stats!.timesFished + 1;
            const fishExp = Math.floor(
                Math.random() *
                    (selectedFish.maxExp - selectedFish.minExp + 1) +
                    selectedFish.minExp,
            );
            cumulativeFishExp += fishExp;
            caughtFishDetails.push({ selectedFish, fishLength, exp: fishExp });
        };

        if (!requiresReel) {
            const availableFish = fishList.filter(
                (fish) =>
                    stats &&
                    fish.fishingLevel <= stats.fishingLevel &&
                    fish.rods.some((rod) => equippedWeapon.name.includes(rod)),
            );
            if (!is.array(availableFish)) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment(
                        "No fish are available for your fishing level or with your current rod.",
                    ),
                );
            }
            for (let j = 0; j < fishToCatch; j++) {
                const selectedFish = selectFish(availableFish);
                const fishLength = selectFishLength();
                processCatch(selectedFish, fishLength);
            }

            const { embed } = await finalizeFishing(
                i.user.id,
                stats!,
                caughtFishDetails,
                cumulativeFishExp,
            );
            await r.edit({ embeds: [embed], components: [] }).catch(noop);
            await cooldowns.set(user, "fish", get.hrs(1));
            locked.del(i.user.id);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("Fishing...")
            .setDescription(
                "You cast your line and wait for a fish to bite <a:loading:1184700865303552031>",
            )
            .setColor("Blue");

        await r.edit({ embeds: [embed] }).catch(noop);

        const minTime = get.secs(5);
        const maxTime = get.mins(1);
        const timeBeforeFishBites =
            Math.random() * (maxTime - minTime) + minTime;

        if (Math.random() <= 0.2) {
            const monsterEmbed = await r.edit(
                embedComment(
                    "While you were fishing, a monster appeared!",
                    "Orange",
                ),
            );
            if (!monsterEmbed) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment("Unable to fetch the original message."),
                );
            }

            const fishingMonster = await getRandomFishingMonster(
                stats!.fishingLevel,
                {
                    attackPower: stats!.attackPower,
                    critChance: stats!.critChance,
                    critValue: stats!.critValue,
                    defChance: stats!.defChance,
                    defValue: stats!.defValue,
                    maxHP: stats!.maxHP,
                    rebirths: stats!.rebirths,
                },
            );
            if (!fishingMonster) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment("No fishing monster available at your level."),
                );
            }

            const outcome = await startFishingEncounter(
                monsterEmbed,
                i.user,
                [fishingMonster.name],
                {
                    win: async () => {
                        const drops = calculateDrop(fishingMonster.drops);
                        let dropMessage = "";
                        if (drops.length > 0) {
                            dropMessage = drops
                                .map(
                                    (drop) =>
                                        `\`${drop.amount}x\` ${drop.item}`,
                                )
                                .join(", ");
                            await addItemToInventory(i.user.id, drops);
                        }
                        const victoryEmbed = new EmbedBuilder()
                            .setTitle("Another Day Survived...")
                            .setDescription(
                                "You defeated the monster!" +
                                    (dropMessage
                                        ? `\nDrops: ${dropMessage}`
                                        : ""),
                            )
                            .setColor("Blue");
                        await r
                            .edit({ embeds: [victoryEmbed], components: [] })
                            .catch(noop);
                        locked.del(i.user.id);
                        return "win";
                    },
                    lose: async () => {
                        await cooldowns.set(user, "fish", get.hrs(1));
                        locked.del(i.user.id);
                        await r
                            .edit({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle("Fishing Failure!")
                                        .setDescription(
                                            "You were defeated by the monster and lost your bait!",
                                        )
                                        .setColor("Red"),
                                ],
                                components: [],
                            })
                            .catch(noop);
                        locked.del(i.user.id);
                        return "lose";
                    },
                },
            );
            if (outcome === "win" || outcome === "lose") {
                return;
            }
        }

        await sleep(timeBeforeFishBites);

        const availableFish = fishList.filter(
            (fish) =>
                stats &&
                fish.fishingLevel <= stats.fishingLevel &&
                fish.rods.some((rod) => equippedWeapon.name.includes(rod)),
        );
        if (!is.array(availableFish)) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "No fish are available for your fishing level or with your current rod.",
                ),
            );
        }

        const selectedFish = selectFish(availableFish);
        const requiredReels = getRandomValue(
            selectedFish.minReels,
            selectedFish.maxReels,
        );
        let reelsCompleted = 0;
        let fishEscaped = false;
        const totalFishToCatch = baitChoice === "Redrot Bait" ? 2 : 1;

        while (reelsCompleted < requiredReels && !fishEscaped) {
            const reelInButton = new ButtonBuilder()
                .setCustomId(`reel_in_${reelsCompleted}`)
                .setLabel("Reel In")
                .setStyle(ButtonStyle.Secondary);
            const fakeButtonLabels = [
                "Pull Line",
                "Cut Line",
                "Release",
                "Reel Out",
            ];
            const allButtons = [
                reelInButton,
                ...fakeButtonLabels.map((label, index) =>
                    new ButtonBuilder()
                        .setCustomId(`fake_button_${index}_${reelsCompleted}`)
                        .setLabel(label)
                        .setStyle(ButtonStyle.Secondary),
                ),
            ];
            shuffle(allButtons);
            const actionRow =
                new ActionRowBuilder<ButtonBuilder>().addComponents(allButtons);
            const promptEmbed = new EmbedBuilder()
                .setTitle(
                    reelsCompleted === 0
                        ? "A fish is biting!"
                        : "Keep reeling!",
                )
                .setDescription(
                    reelsCompleted === 0
                        ? "Quick! Press the correct button (`Reel In`) to catch it!"
                        : "This catch is heavy for your rod, keep reeling!",
                )
                .setColor("Green");
            const message = await r
                .edit({ embeds: [promptEmbed], components: [actionRow] })
                .catch(noop);
            if (!message) {
                locked.del(i.user.id);
                return;
            }
            const c = await awaitComponent(message, {
                custom_ids: ["reel_in", ...fakeButtonLabels].map((r) => ({
                    id: r,
                    includes: true,
                })),
                time: get.secs(3),
                only: { originalUser: true },
            });
            if (!c || !c.customId.startsWith("reel_in") || fishEscaped) {
                fishEscaped = true;
                break;
            }
            await c.deferUpdate().catch(noop);
            reelsCompleted++;
            if (reelsCompleted < requiredReels) {
                continue;
            } else {
                break;
            }
        }

        if (fishEscaped) {
            const escapedEmbed = new EmbedBuilder()
                .setTitle("The fish got away!")
                .setDescription(
                    "You didn't reel in the fish in time, and it escaped.",
                )
                .setColor("Red");
            await r
                .edit({ embeds: [escapedEmbed], components: [] })
                .catch(noop);

            const lureSkill = getUserSkillLevelData(stats, "Lure");
            const fishingCooldown = lureSkill?.levelData?.cooldown
                ? get.mins(lureSkill.levelData.cooldown)
                : get.hrs(1);
            await cooldowns.set(user, "fish", fishingCooldown);
            locked.del(i.user.id);
            return;
        } else {
            for (let f = 0; f < totalFishToCatch; f++) {
                const fishLength = selectFishLength();
                processCatch(selectedFish, fishLength);
            }
            const { embed } = await finalizeFishing(
                i.user.id,
                stats!,
                caughtFishDetails,
                cumulativeFishExp,
            );
            await r.edit({ embeds: [embed], components: [] }).catch(noop);

            const lureSkill = getUserSkillLevelData(stats, "Lure");
            const fishingCooldown = lureSkill?.levelData?.cooldown
                ? get.mins(lureSkill.levelData.cooldown)
                : get.hrs(1);
            await cooldowns.set(user, "fish", fishingCooldown);
            locked.del(i.user.id);
            return;
        }
    },
});
