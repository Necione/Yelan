import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import {
    embedComment,
    get,
    is,
    noop,
    shuffle,
    sleep,
} from "@elara-services/utils";
import type { ButtonInteraction } from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { getProfileByUserId, syncStats, updateUserStats } from "../../services";
import { cooldowns, locked } from "../../utils";
import type { FishData } from "../../utils/rpgitems/fish";
import { fishList } from "../../utils/rpgitems/fish";
import { type WeaponName, weapons } from "../../utils/rpgitems/weapons";

export const fishCommand = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("fish")
        .setDescription("[RPG] Go fishing to catch fish.")
        .setDMPermission(false),
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

        const stats = await syncStats(i.user.id);
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
        if (!equippedWeapon || equippedWeapon.type !== "Rod") {
            locked.del(i.user.id);
            return r.edit(
                embedComment("You need to equip a fishing rod to fish!"),
            );
        }

        const baitItem = stats.inventory.find(
            (item) => item.item === "Fruit Paste Bait",
        );
        if (!is.number(baitItem?.amount) || baitItem.amount < 1) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    `You need \`1x\` **Fruit Paste Bait** to fish. Please get some before fishing!`,
                ),
            );
        }

        baitItem.amount -= 1;
        if (baitItem.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (item) => item.item !== baitItem.item,
            );
        }
        await updateUserStats(i.user.id, {
            inventory: { set: stats.inventory },
        });

        const fishCooldown = cooldowns.get(user, "fish");
        if (!fishCooldown.status) {
            locked.del(i.user.id);
            return r.edit(embedComment(fishCooldown.message));
        }

        const embed = new EmbedBuilder()
            .setTitle("Fishing...")
            .setDescription("You cast your line and wait for a fish to bite...")
            .setColor("Blue");

        await r.edit({ embeds: [embed] }).catch(noop);

        const minTime = get.secs(5);
        const maxTime = get.mins(1);
        const timeBeforeFishBites =
            Math.random() * (maxTime - minTime) + minTime;

        await sleep(timeBeforeFishBites);

        const availableFish = fishList.filter(
            (fish) =>
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

        const requiredReels = getRandomInt(
            selectedFish.minReels,
            selectedFish.maxReels,
        );

        let reelsCompleted = 0;
        let fishEscaped = false;

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

            const fakeButtons = fakeButtonLabels.map((label, index) =>
                new ButtonBuilder()
                    .setCustomId(`fake_button_${index}_${reelsCompleted}`)
                    .setLabel(label)
                    .setStyle(ButtonStyle.Secondary),
            );

            const allButtons = [reelInButton, ...fakeButtons];
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

            const collector = message.createMessageComponentCollector({
                filter: (interaction) => interaction.user.id === i.user.id,
                componentType: ComponentType.Button,
                time: get.secs(3),
                max: 1,
            });

            const buttonPressed = await new Promise<ButtonInteraction | null>(
                (resolve) => {
                    collector.on("collect", (interaction) => {
                        resolve(interaction);
                    });

                    collector.on("end", (collected) => {
                        if (collected.size === 0) {
                            resolve(null);
                        }
                    });
                },
            );

            if (
                !buttonPressed ||
                !buttonPressed.customId.startsWith("reel_in") ||
                fishEscaped
            ) {
                fishEscaped = true;
                break;
            }

            reelsCompleted++;

            if (reelsCompleted < requiredReels) {
                await buttonPressed.deferUpdate().catch(noop);
                continue;
            } else {
                await buttonPressed.deferUpdate().catch(noop);
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

            const newTimesFished = stats.timesFished + 1;

            await updateUserStats(i.user.id, {
                timesFished: newTimesFished,
            });

            await r
                .edit({ embeds: [escapedEmbed], components: [] })
                .catch(noop);

            await cooldowns.set(user, "fish", get.hrs(1));

            locked.del(i.user.id);

            return;
        } else {
            const fishLength = selectFishLength();

            const newFishItem = {
                item: selectedFish.name,
                amount: 1,
                metadata: {
                    length: fishLength,
                },
            };
            stats.inventory.push(newFishItem);

            await updateUserStats(i.user.id, {
                inventory: { set: stats.inventory },
            });

            const newTimesFished = stats.timesFished + 1;
            const newTimesFishedForLevel = (stats.timesFishedForLevel || 0) + 1;

            const { levelUp, requiredFishesForNextLevel } =
                calculateFishingLevel(
                    stats.fishingLevel,
                    newTimesFishedForLevel,
                );

            const updateData: any = {
                timesFished: newTimesFished,
                timesFishedForLevel: newTimesFishedForLevel,
            };

            if (levelUp) {
                updateData.fishingLevel = stats.fishingLevel + 1;
                updateData.timesFishedForLevel = 0;
            }

            await updateUserStats(i.user.id, updateData);

            const caughtEmbed = new EmbedBuilder()
                .setTitle("You caught a fish!")
                .setDescription(
                    `You caught a ${selectedFish.rarity} ${selectedFish.emoji} **${selectedFish.name}**!\n` +
                        `📏 Length: **${fishLength} cm**`,
                )
                .setColor("Aqua");

            if (levelUp) {
                caughtEmbed.addFields({
                    name: "Fishing Level Up!",
                    value: `\`🌟\` Congratulations! You reached Fishing Level ${
                        stats.fishingLevel + 1
                    }!`,
                });
            } else {
                caughtEmbed.addFields({
                    name: "Fishing Progress",
                    value: `\`🎣\` Fishing Level: ${stats.fishingLevel} (${newTimesFishedForLevel}/${requiredFishesForNextLevel} fish caught)`,
                });
            }

            await r.edit({ embeds: [caughtEmbed], components: [] }).catch(noop);

            await cooldowns.set(user, "fish", get.hrs(1));

            locked.del(i.user.id);

            return;
        }
    },
});

function selectFishLength(): number {
    const fishLengths = [
        { length: 30, weight: 25 },
        { length: 60, weight: 20 },
        { length: 90, weight: 15 },
        { length: 120, weight: 12 },
        { length: 150, weight: 10 },
        { length: 180, weight: 7 },
        { length: 210, weight: 5 },
        { length: 240, weight: 3 },
        { length: 370, weight: 2 },
        { length: 400, weight: 1 },
    ];

    const totalWeight = fishLengths.reduce(
        (acc, lengthObj) => acc + lengthObj.weight,
        0,
    );
    let random = Math.random() * totalWeight;

    for (const lengthObj of fishLengths) {
        if (random < lengthObj.weight) {
            return lengthObj.length;
        }
        random -= lengthObj.weight;
    }

    return fishLengths[fishLengths.length - 1].length;
}

function selectFish(
    fishArray: (FishData & { name: string })[],
): FishData & { name: string } {
    const totalWeight = fishArray.reduce((acc, fish) => acc + fish.weight, 0);
    let random = Math.random() * totalWeight;

    for (const fish of fishArray) {
        if (random < fish.weight) {
            return fish;
        }
        random -= fish.weight;
    }

    return fishArray[fishArray.length - 1];
}

function calculateFishingLevel(
    currentLevel: number,
    timesFishedForLevel: number,
): { levelUp: boolean; requiredFishesForNextLevel: number } {
    let requiredFishes = 5 * Math.pow(1.2, currentLevel - 1);
    requiredFishes = Math.round(requiredFishes);

    const levelUp = timesFishedForLevel >= requiredFishes;

    return { levelUp, requiredFishesForNextLevel: requiredFishes };
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
