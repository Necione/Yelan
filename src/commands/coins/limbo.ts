import type { SlashCommand } from "@elara-services/botbuilder";
import { embedComment, sleep } from "@elara-services/utils";
import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { addBalance, getProfileByUserId, removeBalance } from "../../services";
import { customEmoji, locked, texts } from "../../utils";

export const limbo: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName(`limbo`)
        .setDescription(`Guess the multiplier for a chance to win.`)
        .setDMPermission(false)
        .addNumberOption((o) =>
            o.setName("guess")
             .setDescription("Your guess multiplier (must be above 1.05)")
             .setRequired(true)
             .setMinValue(1.05))
        .addIntegerOption((o) =>
            o.setName("bet")
             .setDescription("The bet amount")
             .setRequired(true)
             .setMinValue(10)
             .setMaxValue(500)),

    defer: { silent: false },
    async execute(interaction, responder) {
        if (!interaction.deferred) {
            return;
        }
        locked.set(interaction);

        const guessMultiplier = interaction.options.getNumber("guess", true);
        const betAmount = interaction.options.getInteger("bet", true);
        const userId = interaction.user.id;

        let profit = 0;

        // Check user's balance
        const userProfile = await getProfileByUserId(userId);
        if (!userProfile || userProfile.balance < betAmount) {
            locked.del(userId);
            return responder.edit(embedComment(`You do not have enough balance.`));
        }

        // Initial Embed
        let embed = new EmbedBuilder()
            .setTitle("`🔮` Limbo")
            .setColor(Colors.Yellow)
            .setDescription(`The gods of luck choose upon your fate ${customEmoji.a.loading}`);
        await responder.edit({ embeds: [embed] });

        await sleep(500);

        let crashPoint = getCrashPoint();
        const win = crashPoint >= guessMultiplier;

        if (win) {
            profit = Math.floor(betAmount * (guessMultiplier - 1));
            await addBalance(userId, profit);
        } else {
            await removeBalance(userId, betAmount);
        }
        
        embed = embed
            .setColor(win ? Colors.Green : Colors.Red)
            .setDescription(`- Multiplier: **${crashPoint.toFixed(2)}x**\n- Your Guess: **${guessMultiplier.toFixed(2)}x**`)
            .setFooter({ text: `Bet: ${betAmount} ${texts.c.u}. Your new balance: ${win ? userProfile.balance + profit : userProfile.balance - betAmount}` });        

        locked.del(userId);
        return responder.edit({ embeds: [embed] });
    },
};

function getCrashPoint() {
    const e = 2**32;
    const h = crypto.getRandomValues(new Uint32Array(1))[0];
    if (h % 50 === 0) return 1;
    return Math.floor((100 * e - h) / (e - h)) / 100;
}