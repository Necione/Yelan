import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, make, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    addBalance,
    addItemToInventory,
    getUserCharacters,
    getUserStats,
    updateUserCharacter,
} from "../../services";
import { generateChestLoot } from "../../utils/chest";
import { locationEmojis, locations } from "./travel";

type LocationName = keyof typeof locations;

const expeditionTimes = {
    Explore: 10 * 60,
    Normal: 20 * 60,
    Scavenge: 30 * 60,
} as const;

const expeditionItemsCount = {
    Explore: 2,
    Normal: 4,
    Scavenge: 6,
} as const;

export const expedition = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("expedition")
        .setDescription("[RPG] Manage your expeditions.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("character")
                .setDescription("The character to send on an expedition")
                .setRequired(false)
                .setAutocomplete(true),
        )
        .addStringOption((option) =>
            option
                .setName("location")
                .setDescription("The location to send them to")
                .setRequired(false)
                .addChoices(
                    ...Object.keys(locations).map((loc) => ({
                        name: loc,
                        value: loc,
                    })),
                ),
        )
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("The type of expedition")
                .setRequired(false)
                .addChoices(
                    { name: "Explore (10m)", value: "Explore" },
                    { name: "Normal (20m)", value: "Normal" },
                    { name: "Scavenge (40m)", value: "Scavenge" },
                ),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const focused = i.options.getFocused(true);
        const optionName = focused.name;
        const input = focused.value.toLowerCase();

        if (optionName === "character") {
            const characters = await getUserCharacters(i.user.id);
            if (!is.array(characters)) {
                return i
                    .respond([{ name: "No characters found.", value: "n/a" }])
                    .catch(noop);
            }

            const filtered = characters
                .filter(
                    (c) =>
                        c.name.toLowerCase().includes(input) ||
                        (c.nickname &&
                            c.nickname.toLowerCase().includes(input)),
                )
                .map((c) => ({
                    name: c.nickname ? `${c.nickname} (${c.name})` : c.name,
                    value: c.name,
                }))
                .slice(0, 25);

            if (!is.array(filtered)) {
                return i
                    .respond([{ name: "No match found.", value: "n/a" }])
                    .catch(noop);
            }

            return i.respond(filtered).catch(noop);
        }
    },
    async execute(i, r) {
        const characterName = i.options.getString("character", false);
        const locationName = i.options.getString(
            "location",
            false,
        ) as LocationName | null;
        const expeditionType = i.options.getString("type", false) as
            | keyof typeof expeditionTimes
            | null;

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment("No stats found, please set up your profile."),
            );
        }

        const characters = await getUserCharacters(i.user.id);
        if (!is.array(characters)) {
            return r.edit(embedComment("You have no characters."));
        }

        if (!characterName && !locationName && !expeditionType) {
            const expeditionEmbeds = make.array<EmbedBuilder>();

            for (const character of characters) {
                if (character.expedition) {
                    const startTime = character.expeditionStart;
                    const itemsCount = character.expeditionItemCount || 2;
                    const currentType =
                        character.expeditionType as keyof typeof expeditionTimes;

                    if (!startTime || !currentType) {
                        await updateUserCharacter(character.id, {
                            expedition: { set: false },
                            expeditionStart: { set: null },
                            expeditionType: { set: null },
                            expeditionItemCount: { set: null },
                            expeditionLocation: { set: null },
                        });
                        const corruptEmbed = new EmbedBuilder()
                            .setDescription(
                                `${
                                    character.nickname
                                        ? `${character.nickname} (${character.name})`
                                        : character.name
                                }: Expedition data corrupted, resetting.`,
                            )
                            .setColor("Red");
                        expeditionEmbeds.push(corruptEmbed);
                        continue;
                    }

                    const endTime =
                        startTime.getTime() +
                        expeditionTimes[currentType] * 1000;
                    const now = Date.now();

                    if (now < endTime) {
                        const endTimestamp = Math.floor(endTime / 1000);
                        return r.edit(
                            embedComment(
                                `${
                                    character.nickname
                                        ? `${character.nickname} (${character.name})`
                                        : character.name
                                } is on a ${currentType} expedition, and will return <t:${endTimestamp}:R>.\nRun this command again to claim the items once they're back.`,
                                "Yellow",
                            ),
                        );
                    } else {
                        await updateUserCharacter(character.id, {
                            expedition: { set: false },
                            expeditionStart: { set: null },
                            expeditionType: { set: null },
                            expeditionItemCount: { set: null },
                            expeditionLocation: { set: null },
                        });

                        const worldLevel = stats.worldLevel;
                        const chest = generateChestLoot(worldLevel, itemsCount);

                        await addBalance(
                            i.user.id,
                            chest.coins,
                            false,
                            `${
                                character.nickname
                                    ? `${character.nickname} (${character.name})`
                                    : character.name
                            }'s Expedition Rewards`,
                        );
                        if (chest.loot && chest.loot.length > 0) {
                            await addItemToInventory(
                                i.user.id,
                                chest.loot.map((loot) => ({
                                    item: loot.item,
                                    amount: loot.amount,
                                })),
                            );
                        }

                        const lootDescription =
                            chest.loot.length > 0
                                ? chest.loot
                                      .map(
                                          (item) =>
                                              `\`${item.amount}x\` ${item.item}`,
                                      )
                                      .join(", ")
                                : "No items";

                        const embed = new EmbedBuilder()
                            .setDescription(
                                `${
                                    character.nickname
                                        ? `${character.nickname} (${character.name})`
                                        : character.name
                                } returned from the expedition! They found:\n\n**Coins:** ${
                                    chest.coins
                                }\n**Items:** ${lootDescription}`,
                            )
                            .setColor("Green");
                        expeditionEmbeds.push(embed);
                    }
                } else {
                    const embed = new EmbedBuilder()
                        .setDescription(
                            `${
                                character.nickname
                                    ? `${character.nickname} (${character.name})`
                                    : character.name
                            }: No expedition currently.`,
                        )
                        .setColor("Blue");
                    expeditionEmbeds.push(embed);
                }
            }

            if (!is.array(expeditionEmbeds)) {
                return r.edit(
                    embedComment("No characters or expeditions found."),
                );
            }

            return r.edit({ embeds: expeditionEmbeds });
        }

        if (!characterName || !locationName || !expeditionType) {
            return r.edit(
                embedComment(
                    "You must provide all three options (character, location, type) to start a new expedition if you are not trying to view/collect expeditions.",
                ),
            );
        }

        if (!locations[locationName]) {
            return r.edit(embedComment("Invalid location selected."));
        }

        const character = characters.find(
            (c) => c.name.toLowerCase() === characterName.toLowerCase(),
        );
        if (!character) {
            return r.edit(
                embedComment(
                    `You don't have a character named "${characterName}".`,
                ),
            );
        }

        if (character.expedition) {
            const startTime = character.expeditionStart;
            const itemsCount = character.expeditionItemCount || 2;
            const currentType =
                character.expeditionType as keyof typeof expeditionTimes;

            if (!startTime || !currentType) {
                await updateUserCharacter(character.id, {
                    expedition: { set: false },
                    expeditionStart: { set: null },
                    expeditionType: { set: null },
                    expeditionItemCount: { set: null },
                    expeditionLocation: { set: null },
                });
                return r.edit(
                    embedComment("Expedition data was corrupted, resetting."),
                );
            }

            const endTime =
                startTime.getTime() + expeditionTimes[currentType] * 1000;
            const now = Date.now();
            if (now < endTime) {
                const secondsLeft = Math.floor((endTime - now) / 1000);
                return r.edit(
                    embedComment(
                        `${
                            character.nickname
                                ? `${character.nickname} (${character.name})`
                                : character.name
                        } is still on an expedition!\nTime left: ${getDurationString(
                            secondsLeft,
                        )}`,
                    ),
                );
            }

            await updateUserCharacter(character.id, {
                expedition: { set: false },
                expeditionStart: { set: null },
                expeditionType: { set: null },
                expeditionItemCount: { set: null },
                expeditionLocation: { set: null },
            });

            const worldLevel = stats.worldLevel;
            const chest = generateChestLoot(worldLevel, itemsCount);

            await addBalance(
                i.user.id,
                chest.coins,
                false,
                `${
                    character.nickname
                        ? `${character.nickname} (${character.name})`
                        : character.name
                }'s Expedition Rewards`,
            );
            if (chest.loot && chest.loot.length > 0) {
                await addItemToInventory(
                    i.user.id,
                    chest.loot.map((loot) => ({
                        item: loot.item,
                        amount: loot.amount,
                    })),
                );
            }

            const lootDescription =
                chest.loot.length > 0
                    ? chest.loot
                          .map((item) => `\`${item.amount}x\` ${item.item}`)
                          .join(", ")
                    : "No items";

            return r.edit(
                embedComment(
                    `${
                        character.nickname
                            ? `${character.nickname} (${character.name})`
                            : character.name
                    } returned from the expedition!\n\nThey found:\n**Coins:** ${
                        chest.coins
                    }\n**Items:** ${lootDescription}`,
                    "Green",
                ),
            );
        } else {
            const duration = expeditionTimes[expeditionType];
            const itemsCount = expeditionItemsCount[expeditionType];
            await updateUserCharacter(character.id, {
                expedition: { set: true },
                expeditionStart: { set: new Date() },
                expeditionType: { set: expeditionType },
                expeditionItemCount: { set: itemsCount },
                expeditionLocation: { set: locationName },
            });

            const endTimestamp = Math.floor(Date.now() / 1000) + duration;

            return r.edit(
                embedComment(
                    `You have sent **${
                        character.nickname
                            ? `${character.nickname} (${character.name})`
                            : character.name
                    }** on a ${expeditionType} expedition to ${
                        locationEmojis[locationName]
                    } **${locationName}**!\nThey will return <t:${endTimestamp}:R>.`,
                ),
            );
        }
    },
});

function getDurationString(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
        return `${m}m ${s}s`;
    } else {
        return `${s}s`;
    }
}
