import type { SlashCommand } from "@elara-services/botbuilder";
import { discord, embedComment, formatNumber } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { channels } from "../../config";
import { addBalance, getProfileByUserId, removeBalance } from "../../services";
import {
    checks,
    customEmoji,
    displayTradeInAction,
    getTax,
    isInActiveTrade,
    locked,
    texts,
    tradeTimeout,
    userLockedData,
} from "../../utils";

export const pay: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName(`pay`)
        .setDescription(`Pay another user.`)
        .setDMPermission(false)
        .addUserOption((option) =>
            option.setRequired(true).setName("user").setDescription("The User"),
        )
        .addIntegerOption((option) =>
            option
                .setRequired(true)
                .setName("amount")
                .setDescription("The Amount")
                .setMinValue(10),
        )
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("Optional Message")
                .setRequired(false),
        ),
    defer: {
        silent: false,
    },
    execute: async (interaction, responder) => {
        if (!interaction.inCachedGuild()) {
            return;
        }
        if (isInActiveTrade(interaction)) {
            return;
        }
        locked.set(interaction);

        // Parse the user and amount from the command options
        const user = interaction.options.getUser("user", true);
        const amount = interaction.options.getInteger("amount", true);

        if (user.bot) {
            locked.del(interaction.user.id);
            return;
        }
        if (locked.has(user.id)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(
                    `${user.toString()} is currently waiting for a command to end.`,
                ),
            );
        }
        locked.set(user, interaction.commandName);
        if (tradeTimeout.has(user.id)) {
            locked.del([interaction.user.id, user.id]);
            return responder.edit(displayTradeInAction(user));
        }

        // Check for correct usage and invalid amount
        if (user.id === interaction.user.id || amount < 10) {
            // Added check for minimum transaction amount
            const embed = new EmbedBuilder()
                .setColor(0xffbb33)
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setDescription(
                    `Incorrect command usage or invalid amount. The minimum transaction amount is 10 ${texts.c.u}.`,
                )
                .setFooter({
                    text: "Please note that there is a 10% transaction fee unless you are a booster!",
                });
            locked.del([interaction.user.id, user.id]);
            // Reply with the embed
            return responder.edit({ embeds: [embed] });
        }

        // Check for correct usage and invalid amount
        if (user.id === interaction.user.id || amount <= 0) {
            const embed = new EmbedBuilder()
                .setColor(0xffbb33)
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setDescription(`Incorrect command usage, maybe try again?`)
                .setFooter({
                    text: "Please note that there is a 10% transaction fee unless you are a booster!",
                });
            locked.del([interaction.user.id, user.id]);
            // Reply with the embed
            return responder.edit({ embeds: [embed] });
        }

        // Get the user's balance
        const o = await getProfileByUserId(interaction.user.id);
        if (o.locked) {
            locked.del([interaction.user.id, user.id]);
            return responder.edit(userLockedData(interaction.user.id));
        }
        const userP = await getProfileByUserId(user.id);
        if (userP.locked) {
            locked.del([interaction.user.id, user.id]);
            return responder.edit(userLockedData(user.id));
        }
        const member = interaction.member;
        const fee = await getTax(amount, member);

        if (amount + fee > o.balance) {
            const embed = new EmbedBuilder()
                .setColor(0xff3333)
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setThumbnail("https://file.coffee/u/CWanwcFihzRKWMyxp8g5p.png")
                .setDescription("You cannot afford this transaction.");
            locked.del([interaction.user.id, user.id]);
            return responder.edit({ embeds: [embed] });
        }

        if (checks.limit(userP, Math.floor(amount))) {
            locked.del([interaction.user.id, user.id]);
            return responder.edit(
                embedComment(`You've reached your daily gambling limit.`),
            );
        }

        // Deduct the payment amount (including the fee) from the sender's balance
        await removeBalance(
            interaction.user.id,
            Math.floor(amount + fee),
            false,
            `Via ${pay.command.name}`,
        );

        // Add the payment amount to the receiver's balance
        await addBalance(user.id, amount, false, `Via ${pay.command.name}`);
        await checks.set(userP, amount);

        const total = amount + fee;

        const transactionEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle("New Completed Transaction")
            .setDescription(
                `${interaction.user.username} (${interaction.user.id}) paid \`${total} ${texts.c.u}\` to ${user.username} (${user.id})`,
            )
            .addFields(
                {
                    name: "Amount",
                    value: `${amount} ${texts.c.u}`,
                    inline: true,
                },
                { name: "Fee", value: `${fee} ${texts.c.u}`, inline: true },
            )
            .setTimestamp();

        await discord.messages.send({
            client: interaction.client,
            channelId: channels.transactions.log,
            options: {
                embeds: [transactionEmbed],
            },
        });

        const embed = new EmbedBuilder()
            .setColor(0x57f288)
            .setTitle("Transaction Completed!")
            .setDescription(
                `${customEmoji.a.z_check} | You paid \`${amount} ${texts.c.u}\` to <@${user.id}>.\nA fee of \`${fee} ${texts.c.u}\` was deducted from your account.`,
            );

        const displayMessage =
            interaction.options.getString("message", false) ||
            "No Additional Message";

        const dmEmbed = new EmbedBuilder()
            .setColor(0x57f288)
            .setTitle(`Completed Transaction`)
            .setDescription(
                `${customEmoji.a.z_check} You were paid \`${formatNumber(
                    amount,
                )} ${texts.c.u}\` by <@${interaction.user.id}> (\`${
                    interaction.user.username
                }\`)\n\n**Message Left:** *${displayMessage}*`,
            );

        await user.send({ embeds: [dmEmbed] }).catch(() => null);
        locked.del([interaction.user.id, user.id]);
        await responder.edit({ embeds: [embed] });
    },
};
