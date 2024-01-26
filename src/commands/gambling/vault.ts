import { SlashCommand } from "@elara-services/botbuilder";
import { formatNumber, get, is } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, updateUserProfile } from "../../services";
import { cooldowns, customEmoji, embedComment, logs, texts } from "../../utils";

export const vault: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("vault")
        .setDescription(
            `Deposit or withdraw ${texts.c.u} from your vault or view your vault balance.`,
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("action")
                .setDescription("Choose to deposit or withdraw")
                .setRequired(false)
                .addChoices(
                    { name: "Deposit", value: "deposit" },
                    { name: "Withdraw", value: "withdraw" },
                ),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("Amount to deposit or withdraw")
                .setRequired(false),
        ),
    defer: {
        silent: false,
    },
    execute: async (interaction, responder) => {
        const action =
            interaction.options.getString("action", false) || "check";
        const amount = interaction.options.getInteger("amount", false);
        const p = await getProfileByUserId(interaction.user.id);
        if (action === "check") {
            return responder.edit(
                embedComment(
                    `${customEmoji.a.z_coins} Balance: \`${formatNumber(
                        p.balance,
                    )} ${texts.c.u}\`\n${
                        customEmoji.a.z_coins
                    } Vault: \`${formatNumber(p.vault)} ${texts.c.u}\``,
                    0x57f288,
                ),
            );
        }

        if (!action || !amount || amount <= 0) {
            return responder.edit(
                embedComment(
                    "Please specify both an action (deposit/withdraw) and an amount.",
                ),
            );
        }

        if (action === "deposit") {
            if (p.balance < amount) {
                return responder.edit(
                    embedComment(
                        `You do not have enough ${texts.c.u} to deposit this amount.`,
                    ),
                );
            }
            await logs.action(
                interaction.user.id,
                amount,
                "remove",
                `Via ${vault.command.name} deposit`,
            );
            await updateUserProfile(interaction.user.id, {
                balance: {
                    decrement: amount,
                },
                vault: is.number(p.vault)
                    ? {
                          increment: amount,
                      }
                    : {
                          set: amount,
                      },
            });
            return responder.edit(
                embedComment(
                    `You successfully deposited ${
                        customEmoji.a.z_coins
                    } \`${formatNumber(amount)} ${
                        texts.c.u
                    }\` into your vault.`,
                    0x57f288,
                ),
            );
        } else if (action === "withdraw") {
            const c = cooldowns.get(p, "withdraw");
            if (!c.status) {
                return responder.edit(embedComment(c.message));
            }

            if (p.vault < amount) {
                return responder.edit(
                    embedComment(
                        `You do not have enough ${texts.c.u} in your vault to withdraw this amount.`,
                    ),
                );
            }
            await Promise.all([
                cooldowns.set(p, "withdraw", get.mins(15)),
                logs.action(
                    interaction.user.id,
                    amount,
                    "add",
                    `Via ${vault.command.name} withdraw`,
                ),
                updateUserProfile(interaction.user.id, {
                    balance: {
                        increment: amount,
                    },
                    vault: {
                        decrement: amount,
                    },
                }),
            ]);

            return responder.edit(
                embedComment(
                    `You successfully withdrew ${
                        customEmoji.a.z_coins
                    } \`${formatNumber(amount)} ${
                        texts.c.u
                    }\` from your vault.`,
                    0x57f288,
                ),
            );
        }
    },
};
