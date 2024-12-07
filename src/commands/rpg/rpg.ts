import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, make } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    createDefaultCharacterForUser,
    getProfileByUserId,
    getUserCharacters,
    syncCharacter,
    syncStats,
} from "../../services";
import { cooldowns, getPaginatedMessage } from "../../utils";
import { chars, type CharsName } from "../../utils/charHelper";
import { formatChange } from "../../utils/hunt";
import { artifacts, type ArtifactName } from "../../utils/rpgitems/artifacts";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";
import { calculateFishingLevel } from "./handlers/fishHandler";

export const rpg = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("rpg")
        .setDescription(
            "[RPG] Displays your current RPG stats, now with pagination for characters.",
        )
        .addStringOption((option) =>
            option
                .setName("category")
                .setDescription("The type of stats to display.")
                .setRequired(false)
                .addChoices(
                    { name: "General", value: "General" },
                    { name: "Fishing", value: "Fishing" },
                ),
        )
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        const p = await getProfileByUserId(i.user.id);
        if (!p) {
            return r.edit(
                embedComment(
                    `You don't have a user profile yet, please use \`/profile\`.`,
                ),
            );
        }
        if (p.locked) {
            return r.edit(
                embedComment(
                    `Your user profile is locked, you can't use this command.`,
                ),
            );
        }

        const stats = await syncStats(i.user.id);
        if (!stats) {
            return r.edit(embedComment(`No stats found for you :(`));
        }

        const category = i.options.getString("category") || "General";
        const pager = getPaginatedMessage();

        if (category === "General") {
            const huntCooldown = cooldowns.get(p, "hunt");
            const expRequired = 20 * Math.pow(1.2, stats.worldLevel - 1);

            const embedColor = stats.abyssMode ? "#b84df1" : "Aqua";

            const equippedItems = make.array<string>();

            let hpDisplay: string;
            if (stats.hp > stats.maxHP) {
                hpDisplay = `💜 \`${stats.hp}/${stats.maxHP}\` **OVERHEALED**`;
            } else if (stats.hp < stats.maxHP * 0.3) {
                hpDisplay = `🧡 \`${stats.hp}/${stats.maxHP}\` **LOW HP**`;
            } else {
                hpDisplay = `❤️ \`${stats.hp}/${stats.maxHP}\``;
            }

            let hasCatalyst = false;

            if (
                stats.equippedWeapon &&
                weapons[stats.equippedWeapon as WeaponName]
            ) {
                const equippedWeapon =
                    weapons[stats.equippedWeapon as WeaponName];
                const weaponBonusAttack = equippedWeapon.attackPower || 0;

                equippedItems.push(
                    `${equippedWeapon.emoji} ${
                        stats.equippedWeapon
                    } (${formatChange(weaponBonusAttack)} ATK)`,
                );

                if (
                    equippedWeapon.type &&
                    equippedWeapon.type.toLowerCase() === "catalyst"
                ) {
                    hasCatalyst = true;
                }
            }

            const artifactSlots: { type: ArtifactName | null; slot: string }[] =
                [
                    {
                        type: stats.equippedFlower as ArtifactName,
                        slot: "Flower",
                    },
                    {
                        type: stats.equippedPlume as ArtifactName,
                        slot: "Plume",
                    },
                    {
                        type: stats.equippedSands as ArtifactName,
                        slot: "Sands",
                    },
                    {
                        type: stats.equippedGoblet as ArtifactName,
                        slot: "Goblet",
                    },
                    {
                        type: stats.equippedCirclet as ArtifactName,
                        slot: "Circlet",
                    },
                ];

            for (const slotData of artifactSlots) {
                if (slotData.type && artifacts[slotData.type]) {
                    let emoji = "";
                    switch (slotData.slot) {
                        case "Flower":
                            emoji = "🌸";
                            break;
                        case "Plume":
                            emoji = "🪶";
                            break;
                        case "Sands":
                            emoji = "⏳";
                            break;
                        case "Goblet":
                            emoji = "🍷";
                            break;
                        case "Circlet":
                            emoji = "👑";
                            break;
                    }
                    equippedItems.push(
                        `${emoji} ${slotData.slot}: ${slotData.type}`,
                    );
                }
            }

            let manaDisplay = "";
            if (hasCatalyst) {
                manaDisplay = ` | ✨ Mana: \`${stats.mana}/${stats.maxMana}\``;
            }

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`${i.user.username}'s RPG Stats`)
                .setThumbnail(i.user.displayAvatarURL())
                .addFields({
                    name: "Your Stats",
                    value:
                        `🌍 World Level: \`${
                            stats.worldLevel
                        }\` | <:Item_Adventure_EXP:1287247325135114356> EXP: \`${
                            stats.exp
                        }/${expRequired.toFixed(0)}\`\n` +
                        `🗺️ Region: \`${stats.region}\` | 📍 Location: \`${stats.location}\`\n` +
                        `🌱 Resonance: \`${stats.resonance}\` | 🎗️ Archon: \`${
                            stats.deity || "None"
                        }\`\n\n` +
                        `${hpDisplay}${manaDisplay}\n` +
                        `⚔️ ATK: \`${stats.attackPower.toFixed(
                            2,
                        )} (${formatChange(
                            stats.attackPower - stats.baseAttack,
                        )})\`\n` +
                        (stats.critChance > 0 || stats.critValue > 0
                            ? `🎯 Crit Rate: \`${
                                  stats.critChance
                              }%\` | 💥 Crit Value: \`${stats.critValue.toFixed(
                                  2,
                              )}x\`\n`
                            : "") +
                        (stats.defChance > 0 || stats.defValue > 0
                            ? `🛡️ DEF Rate: \`${
                                  stats.defChance
                              }%\` | 🛡️ DEF Value: \`${stats.defValue.toFixed(
                                  2,
                              )}\`\n`
                            : ""),
                })
                .addFields({
                    name: "Cooldowns",
                    value: `Hunt: ${
                        huntCooldown.status ? "Ready" : huntCooldown.message
                    }`,
                });

            if (is.number(stats.rebirths)) {
                embed.setFooter({
                    text: getRebirthString(stats.rebirths),
                });
            }

            if (is.array(equippedItems)) {
                embed.addFields({
                    name: "Equipped Items",
                    value: equippedItems.join("\n"),
                });
            }

            pager.pages.push({ embeds: [embed] });
        }

        if (category === "Fishing") {
            const fishCooldown = cooldowns.get(p, "fish");
            const { requiredFishesForNextLevel } = calculateFishingLevel(
                stats.fishingLevel,
                stats.timesFishedForLevel || 0,
            );

            const fishCaughtForLevel = stats.timesFishedForLevel || 0;
            const fishNeededForNextLevel = requiredFishesForNextLevel;
            const embedColor = stats.abyssMode ? "#b84df1" : "Aqua";

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`${i.user.username}'s Fishing Stats`)
                .setThumbnail(i.user.displayAvatarURL())
                .setDescription(
                    `🎣 Fishing Level: \`${stats.fishingLevel}\` (\`${fishCaughtForLevel}/${fishNeededForNextLevel}\` fish caught)`,
                )
                .addFields({
                    name: "Fishing Records",
                    value:
                        `🏆 Longest Fish: ${
                            stats.longestFish
                                ? `${stats.longestFish} cm`
                                : "N/A"
                        }\n` +
                        `🐡 Total Fish Caught: ${
                            stats.lifetimeFishCaught || 0
                        }\n` +
                        `🌟 Legendaries Caught: ${
                            stats.legendariesCaught || 0
                        }`,
                })
                .addFields({
                    name: "Cooldowns",
                    value: `Fishing: ${
                        fishCooldown.status ? "Ready" : fishCooldown.message
                    }`,
                });

            pager.pages.push({ embeds: [embed] });
        }

        let characters = await getUserCharacters(i.user.id);
        if (!characters || characters.length === 0) {
            await createDefaultCharacterForUser(i.user.id, "Amber");
            characters = await getUserCharacters(i.user.id);
        }

        const syncedCharacters = [];
        for (const character of characters) {
            const updatedChar = await syncCharacter(character.id);
            if (updatedChar) {
                syncedCharacters.push(updatedChar);
            } else {
                syncedCharacters.push(character);
            }
        }

        if (Array.isArray(characters) && characters.length > 0) {
            for (const character of syncedCharacters) {
                const embedColor = stats.abyssMode ? "#b84df1" : "Aqua";
                const equippedItems = make.array<string>();

                let hpDisplay: string;
                if (character.hp > character.maxHP) {
                    hpDisplay = `💜 \`${character.hp}/${character.maxHP}\` **OVERHEALED**`;
                } else if (character.hp < character.maxHP * 0.3) {
                    hpDisplay = `🧡 \`${character.hp}/${character.maxHP}\` **LOW HP**`;
                } else {
                    hpDisplay = `❤️ \`${character.hp}/${character.maxHP}\``;
                }

                if (character.equippedWeapon) {
                    const eqWeapon =
                        weapons[character.equippedWeapon as WeaponName];
                    if (eqWeapon) {
                        equippedItems.push(
                            `${eqWeapon.emoji} ${
                                character.equippedWeapon
                            } (${formatChange(eqWeapon.attackPower)} ATK)`,
                        );
                    } else {
                        equippedItems.push(`⚔️ ${character.equippedWeapon}`);
                    }
                }

                if (character.equippedFlower) {
                    equippedItems.push(
                        `🌸 Flower: ${character.equippedFlower}`,
                    );
                }
                if (character.equippedPlume) {
                    equippedItems.push(`🪶 Plume: ${character.equippedPlume}`);
                }
                if (character.equippedSands) {
                    equippedItems.push(`⏳ Sands: ${character.equippedSands}`);
                }
                if (character.equippedGoblet) {
                    equippedItems.push(
                        `🍷 Goblet: ${character.equippedGoblet}`,
                    );
                }
                if (character.equippedCirclet) {
                    equippedItems.push(
                        `👑 Circlet: ${character.equippedCirclet}`,
                    );
                }

                const expeditionStatus = character.expedition
                    ? "Currently on Expedition"
                    : "Available";

                const displayName = character.nickname
                    ? `${character.nickname} (${character.name})`
                    : character.name;

                const baseName = character.name as CharsName;
                let chosenThumbnail = i.user.displayAvatarURL();
                if (
                    chars[baseName]?.thumbnails &&
                    chars[baseName].thumbnails.length > 0
                ) {
                    const possibleThumbs = chars[baseName].thumbnails;
                    chosenThumbnail =
                        possibleThumbs[
                            Math.floor(Math.random() * possibleThumbs.length)
                        ];
                }

                const charEmbed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle(`${i.user.username}'s Character: ${displayName}`)
                    .setThumbnail(chosenThumbnail)
                    .setDescription(
                        `**Status:** ${expeditionStatus}\n\n${hpDisplay}\n` +
                            `⚔️ ATK: \`${character.attackPower.toFixed(
                                2,
                            )}\` (Base: ${character.baseAttack})\n` +
                            (character.critChance > 0 || character.critValue > 0
                                ? `🎯 Crit Rate: \`${
                                      character.critChance
                                  }%\` | 💥 Crit Value: \`${character.critValue.toFixed(
                                      2,
                                  )}x\`\n`
                                : "") +
                            (character.defChance > 0 || character.defValue > 0
                                ? `🛡️ DEF Rate: \`${
                                      character.defChance
                                  }%\` | DEF Value: \`${character.defValue.toFixed(
                                      2,
                                  )}\`\n`
                                : ""),
                    );

                if (equippedItems.length > 0) {
                    charEmbed.addFields({
                        name: "Equipped Items",
                        value: equippedItems.join("\n"),
                    });
                }

                pager.pages.push({ embeds: [charEmbed] });
            }
        }

        return pager.run(i, i.user).catch((error) => {
            console.error("Error running pager:", error);
            r.edit(
                embedComment(
                    "An error occurred while displaying your RPG stats.",
                ),
            );
        });
    },
});

function getRebirthString(rebirths: number) {
    const rebirthNames = [
        "☀️ FIRST REBIRTH",
        "🌑 SECOND REBIRTH",
        "🌕 THIRD REBIRTH",
        "🌟 FOURTH REBIRTH",
        "🌌 FIFTH REBIRTH",
        "🌠 SIXTH REBIRTH",
        "🌍 SEVENTH REBIRTH",
        "🌙 EIGHTH REBIRTH",
        "🚀 NINTH REBIRTH",
        "🛰️ TENTH REBIRTH",
    ];

    if (rebirths > 0 && rebirths <= 10) {
        return rebirthNames[rebirths - 1];
    } else if (rebirths > 10) {
        return `✨ ${rebirths} REBIRTHS`;
    } else {
        return "";
    }
}
