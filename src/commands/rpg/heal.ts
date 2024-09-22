import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { customEmoji, texts } from "@liyueharbor/econ";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    removeBalance,
    updateUserStats,
} from "../../services";

export const heal = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("heal")
        .setDescription("[RPG] Visit a Statue of the Seven.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        const userProfile = await getProfileByUserId(i.user.id);
        if (!userProfile) {
            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            "No profile found for your user. Please set up your profile.",
                        )
                        .setColor("Red"),
                ],
            });
        }

        const stats = await getUserStats(i.user.id);

        if (!stats) {
            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            "No stats found for you, please set up your profile.",
                        )
                        .setColor("Red"),
                ],
            });
        }

        if (stats.isHunting) {
            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("You cannot heal while hunting!")
                        .setColor("Red"),
                ],
            });
        }

        let faith = stats.faith ?? 0;
        if (faith < 100) {
            faith += 1;
        }

        const maxHP = stats.maxHP;

        const healPercentage = 0.4 + (faith / 100) * 0.6;

        const healAmount = Math.floor(maxHP * healPercentage);

        const newHp = Math.min(stats.hp + healAmount, maxHP);

        const actualHealAmount = newHp - stats.hp;

        if (actualHealAmount <= 0) {
            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("Your HP is already at maximum.")
                        .setColor("Yellow"),
                ],
            });
        }

        const baseHealCost = Math.floor(Math.random() * (50 - 40 + 1)) + 40;

        const faithDiscount = faith;
        const healCost = Math.max(
            0,
            baseHealCost + stats.worldLevel * 5 - faithDiscount,
        );

        if (userProfile.balance < healCost) {
            return r.edit({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            `You don't have enough ${customEmoji.a.z_coins} Coins to heal. You need at least \`${healCost}\` coins.`,
                        )
                        .setColor("Red"),
                ],
            });
        }

        const createProgressBar = (
            value: number,
            maxValue: number,
            size: number,
        ): string => {
            const percentage = value / maxValue;
            const filledBars = Math.round(size * percentage);
            const emptyBars = size - filledBars;
            return `[${"█".repeat(filledBars)}${"░".repeat(emptyBars)}]`;
        };

        const faithProgressBar = createProgressBar(faith, 100, 20);

        await Promise.all([
            updateUserStats(i.user.id, { hp: newHp, faith }),
            removeBalance(
                i.user.id,
                healCost,
                true,
                `Paid ${healCost} coins to heal ${actualHealAmount} HP`,
            ),
        ]);

        const faithBuffPercentage = Math.round((faith / 100) * 60);
        const faithDiscountAmount =
            baseHealCost + stats.worldLevel * 5 - healCost;

        const embed = new EmbedBuilder()
            .setTitle("Healing Successful")
            .setDescription(
                `The world blesses those with noble hearts.\n\n` +
                    `You healed \`❤️\` \`+${actualHealAmount} HP\` for ${customEmoji.a.z_coins} \`${healCost} ${texts.c.s}\`, ` +
                    `(\`${faithDiscountAmount}\` discount, \`${faithBuffPercentage}%\` buff thanks to your faith.\n` +
                    `Your HP is now \`❤️\` \`${newHp}/${maxHP}\`.\n\n` +
                    `**Faith Progress**: \`${faith}/100\`\n${faithProgressBar}`,
            )
            .setColor("Green")
            .setThumbnail("https://lh.elara.workers.dev/rpg/seven.png");

        return r.edit({ embeds: [embed] });
    },
});
