import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import type { UserStats } from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { addBalance, getUserStats, updateUserStats } from "../../services";
import { artifacts, type ArtifactName } from "../../utils/rpgitems/artifacts";
import { drops, type DropName } from "../../utils/rpgitems/drops";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const rebirth = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("rebirth")
        .setDescription(
            "[RPG] Rebirth your character. All stats and items will be reset.",
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        const rebirthRequirements = [5, 10, 15, 20, 25, 30, 35, 40];
        const requiredWorldLevel = rebirthRequirements[stats.rebirths] || 50;

        if (stats.worldLevel < requiredWorldLevel) {
            return r.edit(
                embedComment(
                    `You must be World Level ${requiredWorldLevel} or higher to rebirth.`,
                    "Red",
                ),
            );
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("Are you sure you want to Rebirth?")
            .setDescription(
                "All your stats will be reset, and you will go back to World Level 1. All items in your bag will be sold.\n\nYou will get +50 Max HP and a higher selling price.",
            )
            .setFooter({ text: "You have 10 seconds to confirm or cancel." });

        const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("confirm_rebirth")
                .setLabel("Confirm")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("cancel_rebirth")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger),
        );

        await r.edit({
            embeds: [confirmEmbed],
            components: [confirmRow],
        });

        let totalSellPrice = 0;

        const rebirthMultiplier = 1 + Math.min(stats.rebirths, 3) * 0.2 + Math.max(0, stats.rebirths - 3) * 0.1;
        let appraiseBonus = 0;

        const hasAppraiseSkill = stats.skills.some(
            (skill) => skill.name === "Appraise",
        );

        for (const item of stats.inventory) {
            const itemData =
                drops[item.item as DropName] ||
                weapons[item.item as WeaponName] ||
                artifacts[item.item as ArtifactName];

            if (itemData) {
                const baseSellPrice = itemData.sellPrice * item.amount;

                let itemSellPrice = baseSellPrice * rebirthMultiplier;

                if (hasAppraiseSkill) {
                    const itemAppraiseBonus = Math.round(itemSellPrice * 0.05);
                    itemSellPrice += itemAppraiseBonus;
                    appraiseBonus += itemAppraiseBonus;
                }

                totalSellPrice += Math.round(itemSellPrice);
            }
        }

        const confirmation = await i.channel
            .awaitMessageComponent({
                time: 10000,
                componentType: ComponentType.Button,
                filter: (interaction) => interaction.user.id === i.user.id,
            })
            .catch(() => null);

        if (!confirmation) {
            const timeoutEmbed = embedComment(
                "Rebirth request timed out.",
                "Red",
            );
            return r.edit({
                embeds: timeoutEmbed.embeds,
                components: [],
            });
        }

        if (confirmation.customId === "confirm_rebirth") {
            await handleRebirth(i.user.id, stats, totalSellPrice);
            const appraiseBonusText =
                appraiseBonus > 0
                    ? `\n🔍 (Appraisal Skill Bonus: +${appraiseBonus} ${texts.c.u})`
                    : "";
            const successEmbed = embedComment(
                `Rebirth complete! All stats and items have been reset.\nAll items have been sold for ${customEmoji.a.z_coins} \`${totalSellPrice} ${texts.c.u}\`${appraiseBonusText}`,
                "Green",
            );
            await confirmation.update({
                embeds: successEmbed.embeds,
                components: [],
            });
        } else {
            const cancelEmbed = embedComment("Rebirth canceled.", "Red");
            await confirmation.update({
                embeds: cancelEmbed.embeds,
                components: [],
            });
        }
    },
});

async function handleRebirth(
    userId: string,
    stats: UserStats,
    totalSellPrice: number,
) {
    const defaultStats = {
        worldLevel: 1,
        exp: 0,
        attackPower: 5,
        maxHP: 100,
        hp: 100,
        critChance: 0,
        critValue: 1,
        defChance: 0,
        defValue: 0,
        highestWL: 1,
        healEffectiveness: 0,
        location: "Liyue Harbor",
        inventory: [],
        beatenBosses: [],
        equippedWeapon: null,
        equippedFlower: null,
        equippedPlume: null,
        equippedSands: null,
        equippedGoblet: null,
        equippedCirclet: null,
        rebirths: (stats.rebirths || 0) + 1,
    };

    await Promise.all([
        updateUserStats(userId, {
            ...defaultStats,
        }),
        addBalance(userId, totalSellPrice, true, "Rebirth - sold all items"),
    ]);
}
