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
import type { Prisma } from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { getProfileByUserId, syncStats, updateUserStats } from "../../services";
import { cooldowns, locked } from "../../utils";
import { type FishData, fishList } from "../../utils/rpgitems/fish";
import { type WeaponName, weapons } from "../../utils/rpgitems/weapons";
import {
    calculateFishingLevel,
    selectFish,
    selectFishLength,
} from "./handlers/fishHandler";

const bait = make.array<string>([
    "Fruit Paste Bait",
    "Redrot Bait",
    "Sugardew Bait",
]);

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

        // Get the bait choice from the command arguments
        const baitChoice = i.options.getString("bait", true);

        // Find the selected bait in the inventory
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

        const fishCooldown = cooldowns.get(user, "fish");
        if (!fishCooldown.status) {
            locked.del(i.user.id);
            return r.edit(embedComment(fishCooldown.message));
        }

        let fishToCatch = 1;
        let requiresReel = true;

        if (baitChoice === "Redrot Bait") {
            fishToCatch = 2;
        } else if (baitChoice === "Sugardew Bait") {
            fishToCatch = 1;
            requiresReel = false;
        }

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

            const caughtFish = [];
            for (let j = 0; j < fishToCatch; j++) {
                const selectedFish = selectFish(availableFish);
                const fishLength = selectFishLength();

                caughtFish.push({ selectedFish, fishLength });
            }

            let totalLevelUps = 0;
            let latestRequiredFishesForNextLevel = 0;

            for (const fish of caughtFish) {
                const { selectedFish, fishLength } = fish;

                const newLongestFish =
                    fishLength > stats.longestFish
                        ? fishLength
                        : stats.longestFish;

                const isLegendary =
                    selectedFish.rarity.toLowerCase() === "legendary";

                const newLifetimeFishCaught =
                    (stats.lifetimeFishCaught || 0) + 1;
                const newLegendariesCaught = isLegendary
                    ? (stats.legendariesCaught || 0) + 1
                    : stats.legendariesCaught || 0;

                stats.inventory.push({
                    id: snowflakes.generate(),
                    item: selectedFish.name,
                    amount: 1,
                    metadata: {
                        length: fishLength,
                        star: null,
                    },
                });

                const newTimesFished = stats.timesFished + 1;
                const newTimesFishedForLevel =
                    (stats.timesFishedForLevel || 0) + 1;

                const { levelUp, requiredFishesForNextLevel } =
                    calculateFishingLevel(
                        stats.fishingLevel,
                        newTimesFishedForLevel,
                    );

                latestRequiredFishesForNextLevel = requiredFishesForNextLevel;

                if (levelUp) {
                    totalLevelUps += 1;
                }

                const updateData: Prisma.UserStatsUpdateInput = {
                    timesFished: { set: newTimesFished },
                    timesFishedForLevel: { set: newTimesFishedForLevel },
                    longestFish: { set: newLongestFish },
                    lifetimeFishCaught: { set: newLifetimeFishCaught },
                    inventory: { set: stats.inventory },
                };

                if (isLegendary) {
                    updateData.legendariesCaught = {
                        set: newLegendariesCaught,
                    };
                }

                if (levelUp) {
                    updateData.fishingLevel = { increment: 1 };
                    updateData.timesFishedForLevel = { set: 0 };
                }

                stats = await updateUserStats(i.user.id, updateData);
                if (!stats) {
                    return;
                }
            }

            const caughtEmbed = new EmbedBuilder()
                .setTitle(`You caught ${fishToCatch} fish!`)
                .setColor("Aqua");

            caughtFish.forEach((fish, index) => {
                const { selectedFish, fishLength } = fish;
                caughtEmbed.addFields({
                    name: `Fish ${index + 1}`,
                    value:
                        `\`${selectedFish.rarity}\` **${selectedFish.name}**\n` +
                        `\`📏\` Length: **${fishLength} cm**`,
                });
            });

            if (totalLevelUps > 0) {
                for (let l = 0; l < totalLevelUps; l++) {
                    caughtEmbed.addFields({
                        name: "Fishing Level Up!",
                        value: `\`🌟\` Congratulations! You reached Fishing Level ${stats.fishingLevel + 1
                            }!`,
                    });
                }
            } else {
                caughtEmbed.addFields({
                    name: "Fishing Progress",
                    value: `\`🎣\` Fishing Level: ${stats.fishingLevel} (${stats.timesFishedForLevel}/${latestRequiredFishesForNextLevel} fish caught)`,
                });
            }

            await r.edit({ embeds: [caughtEmbed], components: [] }).catch(noop);

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

        const caughtFishDetails = make.array<{
            selectedFish: FishData & { name: string };
            fishLength: number;
            levelUp: boolean;
        }>();

        let totalLevelUps = 0;
        let latestRequiredFishesForNextLevel = 0;

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

            await cooldowns.set(user, "fish", get.hrs(1));

            locked.del(i.user.id);

            return;
        } else {
            for (let f = 0; f < totalFishToCatch; f++) {
                const fishLength = selectFishLength();

                const newLongestFish =
                    fishLength > stats.longestFish
                        ? fishLength
                        : stats.longestFish;

                const isLegendary =
                    selectedFish.rarity.toLowerCase() === "legendary";

                const newLifetimeFishCaught =
                    (stats.lifetimeFishCaught || 0) + 1;
                const newLegendariesCaught = isLegendary
                    ? (stats.legendariesCaught || 0) + 1
                    : stats.legendariesCaught || 0;

                stats.inventory.push({
                    id: snowflakes.generate(),
                    item: selectedFish.name,
                    amount: 1,
                    metadata: {
                        length: fishLength,
                        star: null,
                    },
                });

                const newTimesFished = stats.timesFished + 1;
                const newTimesFishedForLevel =
                    (stats.timesFishedForLevel || 0) + 1;

                const { levelUp, requiredFishesForNextLevel } =
                    calculateFishingLevel(
                        stats.fishingLevel,
                        newTimesFishedForLevel,
                    );

                latestRequiredFishesForNextLevel = requiredFishesForNextLevel;

                if (levelUp) {
                    totalLevelUps += 1;
                }

                const updateData: Prisma.UserStatsUpdateInput = {
                    timesFished: { set: newTimesFished },
                    timesFishedForLevel: { set: newTimesFishedForLevel },
                    longestFish: { set: newLongestFish },
                    lifetimeFishCaught: { set: newLifetimeFishCaught },
                    inventory: { set: stats.inventory },
                };

                if (isLegendary) {
                    updateData.legendariesCaught = {
                        set: newLegendariesCaught,
                    };
                }

                if (levelUp) {
                    updateData.fishingLevel = { increment: 1 };
                    updateData.timesFishedForLevel = { set: 0 };
                }

                stats = await updateUserStats(i.user.id, updateData);
                if (!stats) {
                    return;
                }
                caughtFishDetails.push({
                    selectedFish,
                    fishLength,
                    levelUp,
                });
            }

            const caughtEmbed = new EmbedBuilder()
                .setTitle(`You caught ${totalFishToCatch} fish!`)
                .setColor("Aqua");

            caughtFishDetails.forEach((fish, index) => {
                const { selectedFish, fishLength } = fish;
                caughtEmbed.addFields({
                    name: `Fish ${index + 1}`,
                    value:
                        `\`${selectedFish.rarity}\` **${selectedFish.name}**\n` +
                        `\`📏\` Length: **${fishLength} cm**`,
                });
            });

            if (totalLevelUps > 0) {
                for (let l = 0; l < totalLevelUps; l++) {
                    caughtEmbed.addFields({
                        name: "Fishing Level Up!",
                        value: `\`🌟\` Congratulations! You reached Fishing Level ${stats.fishingLevel + 1
                            }!`,
                    });
                }
            } else {
                caughtEmbed.addFields({
                    name: "Fishing Progress",
                    value: `\`🎣\` Fishing Level: ${stats.fishingLevel} (${stats.timesFishedForLevel}/${latestRequiredFishesForNextLevel} fish caught)`,
                });
            }

            await r.edit({ embeds: [caughtEmbed], components: [] }).catch(noop);

            await cooldowns.set(user, "fish", get.hrs(1));

            locked.del(i.user.id);

            return;
        }
    },
});
