import type { SlashCommand } from "@elara-services/botbuilder";
import { SlashCommandBuilder } from "discord.js";
import {
    checks,
    cooldowns,
    embedComment,
    locked,
    texts,
    userLockedData,
} from "../../utils";
import { channels } from "../../config";
import { addBalance, getProfileByUserId } from "../../services";
import { battleMessages } from "../../utils/work";
import { formatNumber, get } from "@elara-services/utils";

export const work: SlashCommand = {
    disabled: {
        channels: [
            channels.general,
            channels.genshin,
            channels.starrail,
            channels.booster,
        ],
    },
    command: new SlashCommandBuilder()
        .setName(`work`)
        .setDescription(
            `Receive complimentary ${texts.c.l} hourly with this command.`,
        )
        .setDMPermission(false),
    defer: { silent: false },
    async execute(interaction, responder) {
        if (!interaction.deferred) {
            return;
        }
        locked.set(interaction);

        const data = await getProfileByUserId(interaction.user.id);
        if (data.locked) {
            locked.del(interaction.user.id);
            return responder.edit(userLockedData(interaction.user.id));
        }

        const amount = Math.floor(Math.random() * 20) + 2;
        const getMsg = () =>
            battleMessages[
                Math.floor(Math.random() * battleMessages.length)
            ].replace(/%AMOUNT%/gi, formatNumber(amount));
        const msg = getMsg();

        if (checks.limit(data, amount)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(
                    `This command could not be completed. This is not a bug.`,
                ),
            );
        }
        const hasCooldown = cooldowns.get(data, "work");
        if (!hasCooldown.status) {
            locked.del(interaction.user.id);
            return responder.edit(embedComment(hasCooldown.message));
        }
        locked.del(interaction.user.id);
        await Promise.all([
            responder.edit(embedComment(msg, "Aqua")),
            cooldowns.set(data, "work", get.hrs(1)),
            addBalance(
                interaction.user.id,
                amount,
                true,
                `Via ${work.command.name}`,
            ),
            checks.set(data, amount),
        ]);
    },
};
