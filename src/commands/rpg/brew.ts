import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get, noop, snowflakes } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { drops } from "../../utils/rpgitems/drops";
import { potions } from "../../utils/rpgitems/potions";

export const brew = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("brew")
        .setDescription(
            "[RPG] Brew potions using a solvent and up to 2 solutes.",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("solvent")
                .setDescription("Which solvent to use?")
                .setRequired(false)
                .addChoices(
                    { name: "Water", value: "Water" },
                    { name: "Methanol", value: "Methanol" },
                ),
        )
        .addStringOption((option) =>
            option
                .setName("solute1")
                .setDescription("The first solute (from drops).")
                .setAutocomplete(true)
                .setRequired(false),
        )
        .addStringOption((option) =>
            option
                .setName("solute2")
                .setDescription("Optional second solute (from drops).")
                .setAutocomplete(true)
                .setRequired(false),
        ),

    async autocomplete(i) {
        const focusedValue = i.options.getFocused() || "";
        const dropNames = Object.keys(drops);
        const filtered = dropNames
            .filter((d) => d.toLowerCase().includes(focusedValue.toLowerCase()))
            .map((d) => ({ name: d, value: d }));
        return i.respond(filtered.slice(0, 25)).catch(noop);
    },

    defer: { silent: false },
    async execute(i, r) {
        const solvent = i.options.getString("solvent", false);
        const solute1 = i.options.getString("solute1", false);
        const solute2 = i.options.getString("solute2", false);

        const brewAmount = 1;

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment("No stats found, please set up your profile."),
            );
        }
        if (stats.isHunting || stats.abyssMode) {
            return r.edit(embedComment("You cannot brew right now!"));
        }

        const now = new Date();
        if (!stats.brewing) {
            stats.brewing = [];
        }

        const currentBrew = stats.brewing.length > 0 ? stats.brewing[0] : null;

        if (currentBrew) {
            if (now >= currentBrew.finishTime) {
                const finalItemName = currentBrew.potionName;
                const amount = currentBrew.amount;

                let success = true;
                if (
                    Object.prototype.hasOwnProperty.call(potions, finalItemName)
                ) {
                    const potionKey = finalItemName as keyof typeof potions;
                    const potData = potions[potionKey];

                    const successChance = potData.successRate;
                    const roll = Math.random();

                    if (roll >= successChance) {
                        success = false;
                    }
                }

                if (success) {
                    const existing = stats.inventory.find(
                        (it) => it.item === finalItemName,
                    );
                    if (existing) {
                        existing.amount += amount;
                    } else {
                        stats.inventory.push({
                            id: snowflakes.generate(),
                            item: finalItemName,
                            amount,
                            metadata: null,
                        });
                    }
                    await r.edit(
                        embedComment(
                            `You have finished brewing and claimed **${amount}x** \`${finalItemName}\`!`,
                        ),
                    );
                } else {
                    const failItemName = "Failed Mixture";
                    const existing = stats.inventory.find(
                        (it) => it.item === failItemName,
                    );
                    if (existing) {
                        existing.amount += amount;
                    } else {
                        stats.inventory.push({
                            id: snowflakes.generate(),
                            item: failItemName,
                            amount,
                            metadata: null,
                        });
                    }
                    await r.edit(
                        embedComment(
                            `Your brew has **failed**! You ended up with **${amount}x** \`${failItemName}\`.`,
                        ),
                    );
                }

                stats.brewing = [];
                await updateUserStats(stats.userId, {
                    brewing: { set: stats.brewing },
                    inventory: { set: stats.inventory },
                });
                return;
            } else {
                return r.edit(
                    embedComment(
                        `You are already brewing a potion!\n` +
                            `It will be done <t:${Math.floor(
                                currentBrew.finishTime.getTime() / 1000,
                            )}:R>. Use the command again to claim it.`,
                    ),
                );
            }
        }

        if (!solvent && !solute1 && !solute2) {
            return r.edit(
                embedComment("You are not currently brewing anything."),
            );
        }

        if (!solvent || !solute1) {
            return r.edit(
                embedComment(
                    "You must provide at least 1 solute and 1 solvent to brew.",
                ),
            );
        }

        const userSolutes = solute2 ? [solute1, solute2] : [solute1];

        let matchedKey: string | null = null;
        let brewTime = get.mins(1);

        for (const [potionName, potData] of Object.entries(potions)) {
            if (!potData.solventOptions.includes(solvent)) {
                continue;
            }

            const foundRecipe = potData.soluteOptions.some((recipeArray) => {
                if (recipeArray.length !== userSolutes.length) {
                    return false;
                }
                const sortedA = [...recipeArray].sort();
                const sortedB = [...userSolutes].sort();
                return sortedA.join("|") === sortedB.join("|");
            });
            if (foundRecipe) {
                matchedKey = potionName;
                brewTime = potData.brewTime;
                break;
            }
        }

        let finalItemName = "Unhomogenized Mixture";
        if (matchedKey) {
            finalItemName = matchedKey;
        }

        for (const solute of userSolutes) {
            const invItem = stats.inventory.find((it) => it.item === solute);
            if (!invItem || invItem.amount < brewAmount) {
                return r.edit(
                    embedComment(
                        `You don't have enough **${solute}** to brew. Need \`${brewAmount}x\`.`,
                    ),
                );
            }
        }

        for (const solute of userSolutes) {
            const invItem = stats.inventory.find((it) => it.item === solute);
            if (!invItem) {
                continue;
            }
            invItem.amount -= brewAmount;
            if (invItem.amount <= 0) {
                stats.inventory = stats.inventory.filter(
                    (i) => i.item !== solute,
                );
            }
        }

        const finishTime = new Date(Date.now() + brewTime);
        stats.brewing.push({
            potionName: finalItemName,
            amount: brewAmount,
            finishTime,
        });

        await updateUserStats(stats.userId, {
            inventory: { set: stats.inventory },
            brewing: { set: stats.brewing },
        });

        const finishTimestamp = `<t:${Math.floor(
            finishTime.getTime() / 1000,
        )}:R>`;
        return r.edit(
            embedComment(
                `Started brewing a potion using \`${solvent}\` + \`${userSolutes.join(
                    ", ",
                )}\`!\nIt will be ready ${finishTimestamp}, use the command again to claim it!`,
            ),
        );
    },
});
