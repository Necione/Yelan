import type { SlashCommand } from "@elara-services/botbuilder";
import { texts } from "@liyueharbor/econ";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { channels } from "../../config";
import { getProfileByUserId } from "../../services";
import { locked, userLockedData } from "../../utils";

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

        locked.del(interaction.user.id);
        await Promise.all([
            responder.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Aqua")
                        .setTitle("`/work` is being depreciated")
                        .setDescription("We're working on a new system to replace this command, sorry!")
                ],
            }),
        ]);
    },
};
