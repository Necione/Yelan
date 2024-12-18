import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, log, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, syncStats, updateUserStats } from "../../services";
import { calculateMasteryLevel } from "../../utils/masteryHelper";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";
import { getAvailableSpells, spells, type Spell } from "../../utils/spells";

export const spell = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("spell")
        .setDescription("[RPG] View available spells or cast one.")
        .addStringOption((option) =>
            option
                .setName("cast")
                .setDescription("The spell you want to cast")
                .setRequired(false)
                .setAutocomplete(true),
        )
        .setDMPermission(false),
    defer: { silent: false },
    async autocomplete(i) {
        try {
            const userId = i.user.id;
            const input = i.options.getString("cast", false) ?? "";

            const stats = await syncStats(userId);
            if (!stats) {
                return i
                    .respond([{ name: "No stats found.", value: "n/a" }])
                    .catch(noop);
            }
            if (!stats) {
                return i
                    .respond([{ name: "Failed to sync stats.", value: "n/a" }])
                    .catch(noop);
            }

            const catalystMasteryPoints = stats.masteryCatalyst || 0;

            const availableSpells = getAvailableSpells(catalystMasteryPoints);

            const filteredSpells = availableSpells.filter((spell) =>
                spell.spellName.toLowerCase().includes(input.toLowerCase()),
            );

            const choices = filteredSpells.slice(0, 25).map((spell) => ({
                name: spell.spellName,
                value: spell.spellName,
            }));

            if (!is.array(choices)) {
                return i
                    .respond([
                        { name: "No matching spells found.", value: "n/a" },
                    ])
                    .catch(noop);
            }

            return i.respond(choices).catch(noop);
        } catch (error) {
            log("Error in spell autocomplete:", error);
            return i
                .respond([{ name: "Error fetching spells.", value: "n/a" }])
                .catch(noop);
        }
    },
    async execute(i, r) {
        try {
            const spellName = i.options.getString("cast", false);

            if (spellName) {
                const userId = i.user.id;

                const userProfile = await getProfileByUserId(userId);
                if (!userProfile) {
                    return r.edit(
                        embedComment(
                            "No profile found for your user. Please set up your profile.",
                        ),
                    );
                }

                const stats = await syncStats(userId);
                if (!stats) {
                    return r.edit(
                        embedComment(
                            `No stats found for you, please set up your profile.`,
                        ),
                    );
                }

                const catalystMasteryPoints = stats.masteryCatalyst || 0;
                const catalystMastery = calculateMasteryLevel(
                    catalystMasteryPoints,
                );
                const numericMasteryLevel = catalystMastery.numericLevel;

                const availableSpells = getAvailableSpells(
                    catalystMasteryPoints,
                );

                const spell: Spell | undefined = spells[spellName];
                if (!spell) {
                    const invalidSpellEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Invalid Spell")
                        .setDescription(`Spell "${spellName}" does not exist.`);

                    return r.edit({ embeds: [invalidSpellEmbed] });
                }

                const isSpellAvailable = availableSpells.some(
                    (availableSpell) => availableSpell.spellName === spellName,
                );

                if (!isSpellAvailable) {
                    const insufficientMasteryEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Mastery Level Too Low")
                        .setDescription(
                            `You need **Catalyst Mastery Level ${spell.requiredMasteryLevel}** to cast "${spellName}".\n\n- **Your Level**: ${numericMasteryLevel}`,
                        );

                    return r.edit({ embeds: [insufficientMasteryEmbed] });
                }

                if (stats.equippedWeapon) {
                    const weaponName = stats.equippedWeapon as WeaponName;
                    const equippedWeapon = weapons[weaponName];

                    if (!equippedWeapon) {
                        const weaponNotFoundEmbed = new EmbedBuilder()
                            .setColor("Red")
                            .setTitle("Weapon Not Found")
                            .setDescription(
                                `Your equipped weapon could not be found.`,
                            );

                        return r.edit({ embeds: [weaponNotFoundEmbed] });
                    }

                    if (equippedWeapon.type !== "Catalyst") {
                        const wrongWeaponTypeEmbed = new EmbedBuilder()
                            .setColor("Red")
                            .setTitle("Wrong Weapon Type")
                            .setDescription(
                                `You must have a **Catalyst** equipped to cast spells.`,
                            );

                        return r.edit({ embeds: [wrongWeaponTypeEmbed] });
                    }
                } else {
                    const noWeaponEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("No Weapon Equipped")
                        .setDescription(
                            `You must equip a **Catalyst** as your weapon to cast spells.`,
                        );

                    return r.edit({ embeds: [noWeaponEmbed] });
                }

                if (stats.mana < spell.cost) {
                    const insufficientManaEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Insufficient Mana")
                        .setDescription(
                            `You don't have enough mana to cast "${spellName}".\n\n- **Cost**: ${spell.cost} Mana\n- **Your Mana**: ${stats.mana}/${stats.maxMana}`,
                        );

                    return r.edit({ embeds: [insufficientManaEmbed] });
                }

                stats.mana -= spell.cost;
                stats.castQueue.push(spellName);

                await updateUserStats(userId, {
                    mana: { set: stats.mana },
                    castQueue: { set: stats.castQueue },
                });

                const spellCastEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Spell Casted")
                    .setDescription(
                        `You have casted \`${spellName}\`. It has been added to your spell queue.\n- **Remaining Mana**: ${stats.mana}/${stats.maxMana}`,
                    );

                return r.edit({ embeds: [spellCastEmbed] });
            } else {
                const userProfile = await getProfileByUserId(i.user.id);
                if (!userProfile) {
                    return r.edit(
                        embedComment(
                            "No profile found for your user. Please set up your profile.",
                        ),
                    );
                }

                const stats = await syncStats(i.user.id);
                if (!stats) {
                    return r.edit(
                        embedComment(
                            `No stats found for you, please set up your profile.`,
                        ),
                    );
                }

                const catalystMasteryPoints = stats.masteryCatalyst || 0;

                const availableSpells = getAvailableSpells(
                    catalystMasteryPoints,
                );

                if (!is.array(availableSpells)) {
                    const noSpellsEmbed = new EmbedBuilder()
                        .setColor("Yellow")
                        .setTitle("No Available Spells")
                        .setDescription(
                            `You currently have no spells available. Increase your mastery level to unlock new spells.`,
                        );

                    return r.edit({ embeds: [noSpellsEmbed] });
                }

                const spellsList = availableSpells
                    .map(
                        (spell) =>
                            `**${spell.spellName}** - ${spell.description} \`(${spell.cost} Mana)\``,
                    )
                    .join("\n");

                const castQueueDisplay =
                    stats.castQueue.length > 0
                        ? stats.castQueue
                              .map((spell) => `**${spell}**`)
                              .join(", ")
                        : "No spells in queue.";

                const additionalDescription =
                    "Skills are activated during a battle in the same order they are casted. Mana is restored at the end of battle.";

                const availableSpellsEmbed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle(`${i.user.username}'s Spells`)
                    .setDescription(
                        `**Available Spells:**\n${spellsList}\n\n**Current Cast Queue:**\n${castQueueDisplay}\n\n${additionalDescription}`,
                    );

                return r.edit({ embeds: [availableSpellsEmbed] });
            }
        } catch (error) {
            log("Error executing /spell command:", error);

            const errorEmbed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Error")
                .setDescription(
                    "An unexpected error occurred while processing your command. Please try again later.",
                );

            return r.edit({ embeds: [errorEmbed] });
        }
    },
});
