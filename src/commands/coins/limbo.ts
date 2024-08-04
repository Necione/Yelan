import { getInt, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, formatNumber, get, sleep } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { addBalance, getProfileByUserId, removeBalance } from "../../services";
import { addRakeback, checks, locked } from "../../utils";

export const limbo: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName(`limbo`)
        .setDescription(`Guess the multiplier for a chance to win.`)
        .setDMPermission(false)
        .addNumberOption((o) =>
            o
                .setName("guess")
                .setDescription("Your guess multiplier (must be above 1.1)")
                .setRequired(true)
                .setMinValue(1.1),
        )
        .addIntegerOption((o) =>
            getInt(o, {
                name: "bet",
                description: `The bet amount`,
                required: true,
                min: 10,
                max: 500,
            }),
        ),
    defer: { silent: false },
    async execute(interaction, responder) {
        if (!interaction.deferred) {
            return;
        }
        locked.set(interaction);

        const guessMultiplier = interaction.options.getNumber("guess", true);
        const betAmount = interaction.options.getInteger("bet", true);
        let profit = 0;

        // Check user's balance
        const p = await getProfileByUserId(interaction.user.id);
        if (!p) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`Unable to find/create your user profile.`),
            );
        }
        if (p.locked) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(
                    `Your profile is locked, you cannot use any commands until it's unlocked.`,
                ),
            );
        }
        if (p.balance < betAmount) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`You don't have enough balance.`),
            );
        }

        // Initial Embed
        const embed = new EmbedBuilder()
            .setTitle("`🔮` Limbo")
            .setColor(Colors.Yellow)
            .setThumbnail(
                "https://cdn.discordapp.com/attachments/1219591114848210968/1238356671814963260/weight-bar.png?ex=663efd06&is=663dab86&hm=6b1f396902ed3614dd8e94638efd184cdbee76dc9cd7f2673634604f3377fcd1&",
            )
            .setDescription(
                `The gods of luck choose upon your fate ${customEmoji.a.loading}`,
            );
        await responder.edit({ embeds: [embed] });
        await sleep(get.secs(1));

        const crashPoint = await getCrashPoint(p, betAmount, guessMultiplier);
        const win = crashPoint >= guessMultiplier;

        if (win) {
            profit = Math.floor(betAmount * (guessMultiplier - 1));
            await addBalance(interaction.user.id, profit);
        } else {
            await Promise.all([
                removeBalance(interaction.user.id, betAmount),
                addRakeback(interaction.user.id, betAmount),
            ]);
        }

        embed
            .setColor(Colors[win ? "Green" : "Red"])
            .setDescription(
                `- Multiplier: **${crashPoint.toFixed(
                    2,
                )}x**\n- Your Guess: **${guessMultiplier.toFixed(2)}x**`,
            )
            .setFooter({
                text: `Bet: ${betAmount} ${
                    texts.c.u
                }. Your new balance: ${formatNumber(
                    win ? p.balance + profit : p.balance - betAmount,
                )}`,
            });

        locked.del(interaction.user.id);
        return responder.edit({ embeds: [embed] });
    },
};

async function getCrashPoint(player: any, betAmount: number, guessMultiplier: number) {
    const rigNumber = await checks.rig(player);

    let crashPoint = parseFloat((Math.random() * 100).toFixed(2));

    const e = 2 ** 32;
    const h = crypto.getRandomValues(new Uint32Array(1))[0];
    if (h % 50 === 0) {
        crashPoint = 1;
    } else {
        crashPoint = Math.floor((100 * e - h) / (e - h)) / 100;

        const increaseLowMultiplierChance = Math.random();
        if (increaseLowMultiplierChance < 0.2) {
            crashPoint = 1 + Math.random();
        }

        if (crashPoint > 1000) {
            crashPoint = Math.random() * 9 + 1;
        }
    }

    if (rigNumber >= 50 && betAmount > rigNumber) {
        crashPoint = parseFloat((Math.random() * (guessMultiplier - 0.01)).toFixed(2));
    }

    return crashPoint;
}
