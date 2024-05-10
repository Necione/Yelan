import type { SlashCommand } from "@elara-services/botbuilder";
import { embedComment, formatNumber, get, sleep } from "@elara-services/utils";
import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, handleBets, removeBalance } from "../../services";
import {
    addRakeback,
    checkBelowBalance,
    checks,
    customEmoji,
    locked,
    texts,
    userLockedData,
} from "../../utils";

export const dice: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName(`dice`)
        .setDescription(`Roll the dice for a chance to win.`)
        .setDMPermission(false)
        .addStringOption((o) =>
            o
                .setRequired(true)
                .setName("roll_type")
                .setDescription(
                    "Choose to roll over or under the chosen number",
                )
                .addChoices(
                    { name: "Roll Over", value: "over" },
                    { name: "Roll Under", value: "under" },
                ),
        )
        .addStringOption((o) =>
            o
                .setRequired(true)
                .setName("roll_number")
                .setDescription("If you roll over this number you win")
                .addChoices(
                    ...[
                        "10",
                        "20",
                        "30",
                        "40",
                        "50",
                        "60",
                        "70",
                        "80",
                        "90",
                    ].map((c) => ({ name: c, value: c })),
                ),
        )
        .addIntegerOption((o) =>
            o
                .setRequired(true)
                .setName("bet")
                .setDescription("The bet amount")
                .setMinValue(10)
                .setMaxValue(2000),
        ),
    defer: { silent: false },
    async execute(interaction, responder) {
        if (!interaction.deferred) {
            return;
        }
        locked.set(interaction);
        const winMultis: { [key: string]: number } = {
            over10: 1.09,
            under90: 1.09,
            over20: 1.19,
            under80: 1.19,
            over30: 1.41,
            under70: 1.41,
            over40: 1.65,
            under60: 1.65,
            over50: 1.98,
            under50: 1.98,
            over60: 2.47,
            under40: 2.47,
            over70: 3.28,
            under30: 3.28,
            over80: 4.95,
            under20: 4.95,
            over90: 6.42,
            under10: 6.42,
        };

        const betAmount = interaction.options.getInteger("bet", true);
        const rollType = interaction.options.getString("roll_type", true);
        const winChance = interaction.options.getString("roll_number", true);
        const multiplier = winMultis[`${rollType}${winChance}`];

        if (
            !["10", "20", "30", "40", "50", "60", "70", "80", "90"].includes(
                winChance,
            )
        ) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(
                    `Invalid win chance. Please choose a multiple of 10.`,
                ),
            );
        }

        const p1 = await getProfileByUserId(interaction.user.id);

        if (p1.locked) {
            locked.del(interaction.user.id);
            return responder.edit(userLockedData(interaction.user.id));
        }

        if (!checkBelowBalance(responder, p1, betAmount)) {
            return locked.del(interaction.user.id);
        }
        if (checks.limit(p1, betAmount)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`You've reached your daily coin earning limit.`),
            );
        }

        let roll = Math.floor(Math.random() * 100) + 1;

        if (checks.rig(p1) >= 100 && betAmount > checks.rig(p1)) {
            if (rollType === "over") {
                roll = Math.floor(Math.random() * parseInt(winChance));
            } else if (rollType === "under") {
                roll =
                    Math.floor(
                        Math.random() * (100 - parseInt(winChance) + 1),
                    ) + parseInt(winChance);
            }
        }

        const isWin =
            rollType === "over"
                ? roll > parseInt(winChance)
                : roll < parseInt(winChance);

        const winnings = isWin ? Math.round(betAmount * multiplier) : 0;
        if (winnings && checks.limit(p1, winnings)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`You've reached your daily coin earning limit.`),
            );
        }
        await removeBalance(
            interaction.user.id,
            Math.floor(betAmount),
            true,
            `Via ${dice.command.name}`,
        );

        const e = new EmbedBuilder()
            .setTitle("`🎲` The Dice Game")
            .setThumbnail('https://cdn.discordapp.com/attachments/1219591114848210968/1238356681906458675/dice.png?ex=663efd08&is=663dab88&hm=9340d5bf549aa55897cd0d03a800a42347645508c915b2746fa9b2913727bd73&')
            .setColor(isWin ? Colors.Green : Colors.Red)
            .setDescription(`Rolling the dice ${customEmoji.a.loading} 🎲`);

        await responder.edit({ embeds: [e] });
        await sleep(get.secs(1));

        const promises: any[] = [
            addRakeback(interaction.user.id, Math.floor(betAmount)),
        ];
        if (isWin) {
            promises.push([
                handleBets(
                    interaction.user.id,
                    Math.floor(winnings),
                    Math.floor(betAmount),
                    `Via ${dice.command.name}`,
                ),
                checks.set(p1, Math.floor(winnings)),
            ]);
        }
        await Promise.all(promises);
        e.setDescription(
            `- Rolled: **${roll}**\n- You ${isWin ? "Won" : "Lost"} ${
                customEmoji.a.z_coins
            } \`${formatNumber(isWin ? winnings : betAmount)} ${texts.c.u}\``,
        ).setFooter({
            text: `Roll ${
                rollType.charAt(0).toUpperCase() + rollType.slice(1)
            }: ${winChance}, Multiplier: ${multiplier.toFixed(2)}x`,
        });

        locked.del(interaction.user.id);
        return responder.edit({
            embeds: [e],
            components: [],
        });
    },
};
