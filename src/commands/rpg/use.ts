import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { potions, type PotionName } from "../../utils/rpgitems/potions";

export const usePotion = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("use")
        .setDescription("[RPG] Use a potion from your inventory.")
        .addStringOption((option) =>
            option
                .setName("potion")
                .setDescription("Which potion to use?")
                .setAutocomplete(true)
                .setRequired(true),
        ),
    async autocomplete(i) {
        const focusedValue = i.options.getFocused() || "";

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return i.respond([]).catch(noop);
        }

        const allPotionKeys = [
            ...Object.keys(potions),
            "Unhomogenized Mixture",
        ];

        const potionItems = stats.inventory.filter((inv) =>
            allPotionKeys.includes(inv.item),
        );

        const filtered = potionItems
            .filter((it) =>
                it.item.toLowerCase().includes(focusedValue.toLowerCase()),
            )
            .map((it) => ({
                name: `${it.item} x${it.amount}`,
                value: it.item,
            }));

        return i.respond(filtered.slice(0, 25)).catch(noop);
    },

    defer: { silent: false },
    async execute(i, r) {
        const potionNameArg = i.options.getString("potion", true);

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment("No stats found, please set up your profile."),
            );
        }

        const invItem = stats.inventory.find((it) => it.item === potionNameArg);
        if (!invItem || invItem.amount <= 0) {
            return r.edit(
                embedComment(`You don't have any **${potionNameArg}** to use.`),
            );
        }

        if (potionNameArg === "Unhomogenized Mixture") {
            invItem.amount -= 1;
            if (invItem.amount <= 0) {
                stats.inventory = stats.inventory.filter(
                    (x) => x.item !== potionNameArg,
                );
            }
            await updateUserStats(stats.userId, {
                inventory: { set: stats.inventory },
            });
            return r.edit(
                embedComment(
                    "You drank the `Unhomogenized Mixture`... and nothing seemed to happen.",
                ),
            );
        }

        if (!Object.prototype.hasOwnProperty.call(potions, potionNameArg)) {
            return r.edit(embedComment(`Invalid potion: ${potionNameArg}.`));
        }

        const potionName = potionNameArg as PotionName;
        const potionData = potions[potionName];

        invItem.amount -= 1;
        if (invItem.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (x) => x.item !== potionNameArg,
            );
        }

        const newEffect = {
            name: potionData.effect.name,
            effectValue: potionData.effect.effectValue,
            remainingUses: potionData.effect.time,
        };

        if (!stats.activeEffects) {
            stats.activeEffects = [];
        }

        stats.activeEffects = stats.activeEffects.filter(
            (eff) => eff.remainingUses > 0,
        );

        const existingEffectIndex = stats.activeEffects.findIndex(
            (eff) => eff.name === newEffect.name,
        );

        if (existingEffectIndex !== -1) {
            const existingEffect = stats.activeEffects[existingEffectIndex];

            if (newEffect.effectValue > existingEffect.effectValue) {
                existingEffect.effectValue = newEffect.effectValue;
            }

            existingEffect.remainingUses = Math.max(
                existingEffect.remainingUses,
                newEffect.remainingUses,
            );
        } else {
            stats.activeEffects.push(newEffect);
        }

        await updateUserStats(stats.userId, {
            inventory: { set: stats.inventory },
            activeEffects: { set: stats.activeEffects },
        });

        return r.edit(
            embedComment(
                `You used **1x** \`${potionNameArg}\` and gained **${potionData.effect.name}** (Value=${potionData.effect.effectValue}) for the next **${potionData.effect.time}** rounds.`,
            ),
        );
    },
});
