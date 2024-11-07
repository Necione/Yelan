import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    syncStats,
    updateUserStats,
} from "../../services";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";
import { spells, type Spell } from "../../utils/spells";

export const spell = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("spell")
        .setDescription("[RPG] View available spells or cast one.")
        .addStringOption((option) =>
            option
                .setName("cast")
                .setDescription("The spell you want to cast")
                .setRequired(false)
                .addChoices(
                    ...Object.keys(spells).map((spellName) => ({
                        name: spellName,
                        value: spellName,
                    })),
                ),
        )
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        try {
            const spellName = i.options.getString("cast", false);

            const userProfile = await getProfileByUserId(i.user.id);
            if (!userProfile) {
                return r.edit(
                    embedComment(
                        "No profile found for your user. Please set up your profile.",
                    ),
                );
            }

            let stats = await getUserStats(i.user.id);
            if (!stats) {
                return r.edit(
                    embedComment(
                        `No stats found for you, please set up your profile.`,
                    ),
                );
            }

            stats = await syncStats(i.user.id);
            if (!stats) {
                return r.edit(
                    embedComment(
                        `Failed to sync your stats. Please try again later.`,
                    ),
                );
            }

            if (spellName) {
                const spell: Spell | undefined = spells[spellName];
                if (!spell) {
                    const invalidSpellEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Invalid Spell")
                        .setDescription(`Spell "${spellName}" does not exist.`);

                    return r.edit({ embeds: [invalidSpellEmbed] });
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

                await updateUserStats(i.user.id, {
                    mana: stats.mana,
                    castQueue: stats.castQueue,
                });

                const spellCastEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Spell Casted")
                    .setDescription(
                        `You have casted "**${spellName}**". It has been added to your spell queue.\n\n- **Remaining Mana**: ${stats.mana}/${stats.maxMana}`,
                    )
                    .setTimestamp();

                return r.edit({ embeds: [spellCastEmbed] });
            } else {
                const availableSpells = Object.values(spells)
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
                        `**Available Spells:**\n${availableSpells}\n\n**Current Cast Queue:**\n${castQueueDisplay}\n\n${additionalDescription}`,
                    );

                return r.edit({ embeds: [availableSpellsEmbed] });
            }
        } catch (error) {
            console.error("Error executing /spell command:", error);

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
