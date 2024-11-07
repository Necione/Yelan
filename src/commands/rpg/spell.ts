import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
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
                    { name: "Heal", value: "Heal" },
                    { name: "Fury", value: "Fury" },
                    { name: "Burn", value: "Burn" },
                    { name: "Cripple", value: "Cripple" },
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
                    return r.edit(
                        embedComment(`Spell "${spellName}" does not exist.`),
                    );
                }

                if (stats.equippedWeapon) {
                    const weaponName = stats.equippedWeapon as WeaponName;
                    const equippedWeapon = weapons[weaponName];

                    if (!equippedWeapon) {
                        return r.edit(
                            embedComment(
                                `Your equipped weapon could not be found.`,
                            ),
                        );
                    }

                    if (equippedWeapon.type !== "Catalyst") {
                        return r.edit(
                            embedComment(
                                `You must have a **Catalyst** equipped to cast spells.`,
                            ),
                        );
                    }
                } else {
                    return r.edit(
                        embedComment(
                            `You must equip a **Catalyst** as your weapon to cast spells.`,
                        ),
                    );
                }

                if (stats.mana < spell.cost) {
                    return r.edit(
                        embedComment(
                            `You don't have enough mana to cast "${spellName}".\n- **Cost**: ${spell.cost} Mana\n- **Your Mana**: ${stats.mana}/${stats.maxMana}`,
                        ),
                    );
                }

                stats.mana -= spell.cost;

                stats.castQueue.push(spellName);

                await updateUserStats(i.user.id, {
                    mana: stats.mana,
                    castQueue: stats.castQueue,
                });

                return r.edit(
                    embedComment(
                        `You have casted "${spellName}". It has been added to your spell queue.\n- **Remaining Mana**: ${stats.mana}/${stats.maxMana}`,
                        "Green",
                    ),
                );
            } else {
                const availableSpells = Object.values(spells)
                    .map(
                        (spell) =>
                            `**${spell.spellName}** - ${spell.description} \`(${spell.cost} Mana)\``,
                    )
                    .join("\n");

                const castQueue =
                    stats.castQueue.length > 0
                        ? stats.castQueue.join(", ")
                        : "No spells in queue.";

                return r.edit(
                    embedComment(
                        `**Available Spells:**\n${availableSpells}\n\n**Current Cast Queue:**\n${castQueue}`,
                        "Blue",
                    ),
                );
            }
        } catch (error) {
            console.error("Error executing /spell command:", error);
            return r.edit(
                embedComment(
                    "An unexpected error occurred while processing your command. Please try again later.",
                    "Red",
                ),
            );
        }
    },
});
