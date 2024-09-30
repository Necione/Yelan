import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import type { Interaction } from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    updateUserStats,
} from "../../services";
import { cooldowns, locked } from "../../utils";
import { handleChest, handleMaterials } from "./handlers/exploreHandler";
import { handleHealingWell } from "./handlers/healingWellHandler";
import { handleHunt } from "./handlers/huntHandler";

const materialsDescriptions = [
    "Woah! Look look, there's some stuff over there. Paimon thinks we should pick some of that up for later.",
    "You found some interesting materials on the ground. They might be useful?",
    "You stumbled upon some materials. What do you want to do?",
];

function getRandomDescription(descriptions: string[]): string {
    return descriptions[Math.floor(Math.random() * descriptions.length)];
}

type EncounterType = "monster" | "chest" | "materials" | "healing_well";

const encounterConfigs: Record<
    EncounterType,
    {
        description: string;
        buttons?: { id: string; label: string; style: ButtonStyle }[];
    }
> = {
    monster: {
        description: "You encountered a monster... prepare for battle!",
    },
    chest: {
        description: "You stumbled across a treasure chest.",
        buttons: [
            {
                id: "open_chest",
                label: "Open Chest",
                style: ButtonStyle.Primary,
            },
            {
                id: "ignore_chest",
                label: "Ignore",
                style: ButtonStyle.Secondary,
            },
        ],
    },
    materials: {
        description: getRandomDescription(materialsDescriptions),
        buttons: [
            { id: "gather", label: "Gather", style: ButtonStyle.Primary },
            {
                id: "ignore_materials",
                label: "Ignore",
                style: ButtonStyle.Secondary,
            },
        ],
    },
    healing_well: {
        description: "You found a healing well.",
        buttons: [
            { id: "drink", label: "Drink", style: ButtonStyle.Primary },
            {
                id: "ignore_healing_well",
                label: "Ignore",
                style: ButtonStyle.Secondary,
            },
        ],
    },
};

export const adventure = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("adventure")
        .setDescription("[RPG] Continue your adventure.")
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(interaction, response) {
        locked.set(interaction.user);

        let adventureEnded = false;

        try {
            const message = await interaction.fetchReply();
            if (!message) {
                throw new Error("Unable to fetch the original message.");
            }

            const userWallet = await getProfileByUserId(interaction.user.id);
            if (!userWallet) {
                throw new Error("Unable to find/create your user profile.");
            }

            const cooldown = cooldowns.get(userWallet, "adventure");
            if (!cooldown.status) {
                throw new Error(cooldown.message);
            }

            const stats = await getUserStats(interaction.user.id);
            if (!stats) {
                throw new Error(
                    "No stats found for you, please set up your profile.",
                );
            }

            if (stats.location === "Liyue Harbor") {
                throw new Error(
                    "You cannot go on an adventure in Liyue Harbor!",
                );
            }

            if (stats.isTravelling) {
                throw new Error(
                    "You cannot go on an adventure while you are travelling!",
                );
            }

            if (stats.isHunting) {
                throw new Error("You are already adventuring!");
            }

            if (stats.hp <= 0) {
                throw new Error(
                    "You don't have enough HP to go on an adventure :(",
                );
            }

            await updateUserStats(interaction.user.id, { isHunting: true });

            await response.edit({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`Exploring in ${stats.location}...`)
                        .setColor(Colors.Blue),
                ],
            });

            let encounterCount = 0;
            let ignoreCount = 0;
            const maxEncounters = 5;
            const maxIgnores = 5;

            const generateRandomDelay = () =>
                Math.floor(Math.random() * 2000) + 3000;

            while (encounterCount < maxEncounters && ignoreCount < maxIgnores) {
                await new Promise((resolve) =>
                    setTimeout(resolve, generateRandomDelay()),
                );

                let encounterType: EncounterType;
                if (Math.random() < 0.2) {
                    encounterType = "healing_well";
                } else {
                    const encounterTypes: EncounterType[] = [
                        "monster",
                        "chest",
                        "materials",
                    ];
                    encounterType =
                        encounterTypes[
                            Math.floor(Math.random() * encounterTypes.length)
                        ];
                }

                const config = encounterConfigs[encounterType];

                const embed = new EmbedBuilder()
                    .setDescription(config.description)
                    .setColor(Colors.Blue);

                if (config.buttons && config.buttons.length > 0) {
                    const actionRow =
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            config.buttons.map((btn) =>
                                new ButtonBuilder()
                                    .setCustomId(btn.id)
                                    .setLabel(btn.label)
                                    .setStyle(btn.style),
                            ),
                        );

                    await response.edit({
                        embeds: [embed],
                        components: [actionRow],
                    });

                    const filter = (i: Interaction) =>
                        i.user.id === interaction.user.id;
                    const collected = await message
                        .awaitMessageComponent({
                            filter,
                            componentType: ComponentType.Button,
                            time: 10000,
                        })
                        .catch(() => null);

                    if (!collected) {
                        await response.edit({
                            embeds: [
                                new EmbedBuilder()
                                    .setDescription(
                                        "Hey! Paimon isn't going to wait forever.\nTell me when you're ready to go again.",
                                    )
                                    .setColor(Colors.Red),
                            ],
                            components: [],
                        });
                        break;
                    }

                    if (!collected.isButton()) {
                        continue;
                    }

                    switch (collected.customId) {
                        case "hunt":
                            await handleHunt(
                                interaction,
                                message,
                                stats,
                                userWallet,
                            );
                            adventureEnded = true;
                            break;
                        case "open_chest":
                            await handleChest(interaction, stats, userWallet);
                            adventureEnded = true;
                            break;
                        case "gather":
                            await handleMaterials(
                                interaction,
                                stats,
                                userWallet,
                            );
                            adventureEnded = true;
                            break;
                        case "drink":
                            await handleHealingWell(collected, stats);

                            await new Promise((resolve) =>
                                setTimeout(resolve, 5000),
                            );

                            await response.edit({
                                embeds: [
                                    new EmbedBuilder()
                                        .setDescription(
                                            "You continue exploring...",
                                        )
                                        .setColor(Colors.Green),
                                ],
                                components: [],
                            });
                            break;
                        case "ignore":
                        case "ignore_chest":
                        case "ignore_materials":
                        case "ignore_healing_well":
                            ignoreCount++;
                            await collected.update({
                                embeds: [
                                    new EmbedBuilder()
                                        .setDescription(
                                            "You continue exploring...",
                                        )
                                        .setColor(Colors.Green),
                                ],
                                components: [],
                            });
                            break;
                        default:
                            break;
                    }

                    if (adventureEnded) {
                        break;
                    }

                    encounterCount++;
                } else {
                    if (encounterType === "monster") {
                        await response.edit({
                            embeds: [embed],
                            components: [],
                        });

                        await handleHunt(
                            interaction,
                            message,
                            stats,
                            userWallet,
                        );

                        adventureEnded = true;

                        encounterCount++;
                        break;
                    }
                }
            }

            if (adventureEnded) {
                await response.edit({
                    components: [],
                });
            } else if (
                encounterCount >= maxEncounters ||
                ignoreCount >= maxIgnores
            ) {
                await response.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(
                                "Paimon feels tired... let's go and rest for now.",
                            )
                            .setColor(Colors.Blue),
                    ],
                    components: [],
                });
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                await response.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(error.message)
                            .setColor(
                                error.message.includes("cannot") ||
                                    error.message.includes("not")
                                    ? Colors.Yellow
                                    : Colors.Red,
                            ),
                    ],
                });
            } else {
                console.error("Unexpected error type:", error);
                await response.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription("An unexpected error occurred.")
                            .setColor(Colors.Red),
                    ],
                });
            }
        } finally {
            locked.del(interaction.user.id);
            await updateUserStats(interaction.user.id, { isHunting: false });
        }
    },
});
