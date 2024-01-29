import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get } from "@elara-services/utils";
import { ButtonStyle, SlashCommandBuilder } from "discord.js";
import { roles } from "../../config";
import { addButtonRow } from "../../utils";

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
            components: [
                addButtonRow({
                    id: `button:press`,
                    label: "Press",
                    style: ButtonStyle.Primary,
                }),
            ],
        });
        const col = await msg
            .awaitMessageComponent({
                filter: (i) =>
                    i.user.id !== interaction.user.id &&
                    i.customId === "button:press",
                time: get.secs(30),
            })
            .catch(() => null);
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
