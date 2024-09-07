import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import {
    addButtonRow,
    awaitComponent,
    discord,
    embedComment,
    get,
    noop,
} from "@elara-services/utils";
import { ButtonStyle, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { channels } from "../../config";

export const promise = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`promise`)
        .setDescription(`Make a promise to someone`)
        .setDMPermission(false)
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The User to whom you are making the promise")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("promise")
                .setDescription("Your promise")
                .setRequired(true),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.channel) {
            return;
        }
        const message = await i.fetchReply().catch(noop);
        if (!message) {
            return;
        }
        const promiseChannel = i.client.channels.resolve(
            channels.logs.promises,
        );
        if (!promiseChannel || !promiseChannel.isTextBased()) {
            return r.edit(embedComment(`Unable to find the promises channel.`));
        }

        const user = i.options.getUser("user", true);
        const promise = i.options.getString("promise", true);

        if (user.id === i.user.id) {
            return r.edit(
                embedComment(
                    "If you want to set life goals, try not do on Discord.",
                ),
            );
        }
        if (user.bot) {
            return r.edit(embedComment(`You can't make a promise to a bot.`));
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor(0xc0f6fb)
            .setTitle("Confirm your Promise")
            .setDescription(
                "Are you sure? If your promise is not met and the other party complains, staff will intervene.",
            );

        await r.edit({
            embeds: [confirmEmbed],
            components: [
                addButtonRow([
                    {
                        id: "confirm-yes",
                        label: "Yes",
                        style: ButtonStyle.Success,
                    },
                    {
                        id: "confirm-cancel",
                        label: "Cancel",
                        style: ButtonStyle.Danger,
                    },
                ]),
            ],
        });
        const co = await awaitComponent(message, {
            custom_ids: [{ id: `confirm-yes` }, { id: `confirm-cancel` }],
            users: [{ allow: true, id: i.user.id }],
            time: get.secs(10),
        });

        if (!co) {
            return r.edit(embedComment(`Promise Cancelled.`));
        }
        if (co.customId !== "confirm-yes") {
            return co.update(embedComment(`Promise Cancelled.`)).catch(noop);
        }
        await co.update({ components: [] }).catch(noop);
        const promiseEmbed = new EmbedBuilder()
            .setColor(0xc0f6fb)
            .setTitle("New Promise Made")
            .setDescription(
                `**${i.user.username}** promises **${user.username}:**\n\`${promise}\``,
            )
            .addFields({
                name: `Users`,
                value: `- ${i.user.toString()} (${
                    i.user.id
                })\n- ${user.toString()} (${user.id})`,
            })
            .setTimestamp();
        const data = await discord.messages.send({
            client: i.client,
            channelId: promiseChannel.id,
            options: {
                embeds: [promiseEmbed],
            },
        });
        if (!data) {
            return r.edit(embedComment(`Unable to create the promise.`));
        }
        await Promise.all([
            i.user
                .send(
                    embedComment(
                        `📝 You made a promise to someone:\n- Promise: ${promise}\n- User: ${user.toString()} \`@${
                            user.username
                        }\` (${user.id})`,
                        "Yellow",
                    ),
                )
                .catch(noop),
            user
                .send(
                    embedComment(
                        `📝 A promise was made to you:\n- Promise: ${promise}\n- User: ${i.user.toString()} \`@${
                            i.user.username
                        }\` (${i.user.id})`,
                        "Yellow",
                    ),
                )
                .catch(noop),
        ]);
        return r.edit(embedComment(`Your promise has been sent!`, "Green"));
    },
});
