import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import {
    addButtonRow,
    awaitComponent,
    displayButtonRandomly,
    embedComment,
    get,
} from "@elara-services/utils";
import { ButtonStyle, SlashCommandBuilder } from "discord.js";
import { roles } from "../../config";

export const button = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`button`)
        .setDescription(`[STAFF]: Send a button to get pressed.`)
        .setDMPermission(false),
    defer: { silent: false },
    locked: { roles: roles.main },
    async execute(interaction, responder) {
        const msg = await interaction.fetchReply().catch(() => null);
        if (!msg) {
            return;
        }

        await responder.edit({
            components: displayButtonRandomly({
                id: `button:press`,
                label: "Press",
                style: ButtonStyle.Primary,
            }),
        });
        const col = await awaitComponent(msg, {
            custom_ids: [{ id: `button:press` }],
            time: get.secs(30),
            users: [{ allow: false, id: interaction.user.id }],
        });
        if (!col) {
            return responder.edit(embedComment(`No one pressed it.`));
        }
        return col
            .update({
                content: col.user.toString(),
                components: [
                    addButtonRow([
                        {
                            id: "xxx",
                            label: `@${col.user.username}`,
                            style: ButtonStyle.Success,
                            disabled: true,
                        },
                        {
                            id: "yyy",
                            label: col.user.id,
                            style: ButtonStyle.Success,
                            disabled: true,
                        },
                    ]),
                ],
            })
            .catch(() => null);
    },
});
