import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get, noop, shuffle, sleep } from "@elara-services/utils";
import type { ButtonInteraction, Message } from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
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
import type { FishData } from "../../utils/rpgitems/fish";
import { fishList } from "../../utils/rpgitems/fish";

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
            (fish) => fish.fishingLevel <= stats.fishingLevel,
        );

        if (!Array.isArray(availableFish) || availableFish.length === 0) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("No fish are available for your fishing level."),
            );
        }

        const selectedFish = selectFish(availableFish);

        const fishCaughtEmbed = new EmbedBuilder()
            .setTitle("A fish is biting!")
            .setDescription(
                "Quick! Press the `Reel In` correct button to catch it!",
            )
            .setColor("Green");

        const reelInButton = new ButtonBuilder()
            .setCustomId("reel_in")
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
                .setCustomId(`fake_button_${index}`)
                .setLabel(label)
                .setStyle(ButtonStyle.Secondary),
        );

        const allButtons = [reelInButton, ...fakeButtons];
        shuffle(allButtons);

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            allButtons,
        );

        const message = (await r
            .edit({ embeds: [fishCaughtEmbed], components: [actionRow] })
            .catch(noop)) as Message | undefined;

        if (!message) {
            locked.del(i.user.id);
            return;
        }

        const filter = (interaction: ButtonInteraction) =>
            interaction.user.id === i.user.id;

        const collector = message.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: get.secs(3),
            max: 1,
        });

        let caughtFish = false;

        collector.on("collect", async (interaction: ButtonInteraction) => {
            if (interaction.customId === "reel_in") {
                caughtFish = true;
                await interaction.deferUpdate().catch(noop);

                await addItemToInventory(i.user.id, [
                    { item: selectedFish.name, amount: 1 },
                ]);

                const newTimesFished = stats.timesFished + 1;
                const newTimesFishedForLevel =
                    (stats.timesFishedForLevel || 0) + 1;

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
                        `You caught a ${selectedFish.rarity} ${selectedFish.emoji} **${selectedFish.name}**!`,
                    )
                    .setColor("Aqua");

                if (levelUp) {
                    caughtEmbed.addFields({
                        name: "Fishing Level Up!",
                        value: `Congratulations! You reached Fishing Level ${
                            stats.fishingLevel + 1
                        }!`,
                    });
                } else {
                    caughtEmbed.addFields({
                        name: "Fishing Progress",
                        value: `Fishing Level: ${stats.fishingLevel} (${newTimesFishedForLevel}/${requiredFishesForNextLevel} fishes caught)`,
                    });
                }

                await r
                    .edit({ embeds: [caughtEmbed], components: [] })
                    .catch(noop);

                await cooldowns.set(user, "fish", get.hrs(1));

                locked.del(i.user.id);

                collector.stop();
            } else {
                caughtFish = false;
                await interaction.deferUpdate().catch(noop);
                const escapedEmbed = new EmbedBuilder()
                    .setTitle("The fish got away!")
                    .setDescription(
                        "You made the wrong move, and the fish escaped.",
                    )
                    .setColor("Red");

                const newTimesFished = stats.timesFished + 1;
                const newTimesFishedForLevel = stats.timesFishedForLevel || 0;

                const { levelUp, requiredFishesForNextLevel } =
                    calculateFishingLevel(
                        stats.fishingLevel,
                        newTimesFishedForLevel,
                    );

                const updateData: any = {
                    timesFished: newTimesFished,
                };

                if (levelUp) {
                    updateData.fishingLevel = stats.fishingLevel + 1;
                    updateData.timesFishedForLevel = 0;
                }

                await updateUserStats(i.user.id, updateData);

                if (levelUp) {
                    escapedEmbed.addFields({
                        name: "Fishing Level Up!",
                        value: `\`🐟\` Congratulations! You reached Fishing Level ${
                            stats.fishingLevel + 1
                        }!`,
                    });
                } else {
                    escapedEmbed.addFields({
                        name: "Fishing Progress",
                        value: `\`🐠\` Fishing Level: ${stats.fishingLevel} (${newTimesFishedForLevel}/${requiredFishesForNextLevel} fishes caught)`,
                    });
                }

                await r
                    .edit({ embeds: [escapedEmbed], components: [] })
                    .catch(noop);

                await cooldowns.set(user, "fish", get.hrs(1));

                locked.del(i.user.id);

                collector.stop();
            }
        });

        collector.on("end", async () => {
            if (!caughtFish) {
                const escapedEmbed = new EmbedBuilder()
                    .setTitle("The fish got away!")
                    .setDescription(
                        "You didn't reel in the fish in time, and it escaped.",
                    )
                    .setColor("Red");

                const newTimesFished = stats.timesFished + 1;
                const newTimesFishedForLevel = stats.timesFishedForLevel || 0;

                const { levelUp, requiredFishesForNextLevel } =
                    calculateFishingLevel(
                        stats.fishingLevel,
                        newTimesFishedForLevel,
                    );

                const updateData: any = {
                    timesFished: newTimesFished,
                };

                if (levelUp) {
                    updateData.fishingLevel = stats.fishingLevel + 1;
                    updateData.timesFishedForLevel = 0;
                }

                await updateUserStats(i.user.id, updateData);

                if (levelUp) {
                    escapedEmbed.addFields({
                        name: "Fishing Level Up!",
                        value: `Congratulations! You reached Fishing Level ${
                            stats.fishingLevel + 1
                        }!`,
                    });
                } else {
                    escapedEmbed.addFields({
                        name: "Fishing Progress",
                        value: `Fishing Level: ${stats.fishingLevel} (${newTimesFishedForLevel}/${requiredFishesForNextLevel} fishes caught)`,
                    });
                }

                await r
                    .edit({ embeds: [escapedEmbed], components: [] })
                    .catch(noop);

                await cooldowns.set(user, "fish", get.hrs(1));

                locked.del(i.user.id);
            }
        });
    },
});

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
