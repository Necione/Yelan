import { SlashCommand } from "@elara-services/botbuilder";
import { formatNumber, is, time } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { channels, economy } from "../../config";
import { getProfileByUserId, updateUserProfile } from "../../services";
import {
    checks,
    cooldowns,
    customEmoji,
    embedComment,
    isInActiveTrade,
    locked,
    logs,
    texts,
    userLockedData,
} from "../../utils";

export const rakeback: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName(`rakeback`)
        .setDescription(`Get your rakeback amount.`)
        .setDMPermission(false),
    defer: {
        silent: false,
    },
    locked: {
        channels: [channels.botcommands, ...channels.testingbotcommands],
    },
    execute: async (interaction, responder) => {
        if (isInActiveTrade(interaction)) {
            return;
        }
        locked.set(interaction);
        const data = await getProfileByUserId(interaction.user.id);
        if (data.locked) {
            locked.del(interaction.user.id);
            return responder.edit(userLockedData(interaction.user.id));
        }
        if (!data.rakeback || !is.number(data.rakeback?.amount)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`You don't have anything to rakeback.`),
            );
        }
        const c = cooldowns.get(
            data,
            "rakeback",
            `⌚ You've already claimed your rakeback for today, try again %DURATION%\n> You have \`${formatNumber(
                data.rakeback.amount,
            )} ${texts.c.u}\` to collect next!`,
        );
        if (!c.status) {
            locked.del(interaction.user.id);
            return responder.edit(embedComment(c.message));
        }

        if (checks.limit(data, data.rakeback.amount)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(
                    `This command could not be completed. This is not a bug.`,
                ),
            );
        }
        await Promise.all([
            cooldowns.set(data, "rakeback", economy.commands.rakeback.time),
            logs.action(
                interaction.user.id,
                data.rakeback.amount,
                "add",
                `Via ${rakeback.command.name}`,
            ),
            updateUserProfile(interaction.user.id, {
                balance: {
                    increment: data.rakeback.amount,
                },
                rakeback: {
                    amount: 0,
                    claimed: 0,
                },
            }),
        ]);
        locked.del(interaction.user.id);
        return responder.edit(
            embedComment(
                `You've claimed your rakeback of ${
                    customEmoji.a.z_coins
                }\`${formatNumber(data.rakeback.amount)}\` ${
                    texts.c.u
                }!\nYou can claim your rakeback again ${time.countdown(
                    economy.commands.rakeback.time,
                )}`,
                "Green",
            ),
        );
    },
};
