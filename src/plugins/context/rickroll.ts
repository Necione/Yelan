import {
    buildCommand,
    type MessageContextMenuCommand,
} from "@elara-services/botbuilder";
import {
    ApplicationCommandType,
    ComponentType,
    ContextMenuCommandBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { roles } from "../../config";
import { images } from "../../utils/images";

export const rickroll = buildCommand<MessageContextMenuCommand>({
    command: new ContextMenuCommandBuilder()
        .setName(`RickRoll?`)
        .setDMPermission(false)
        .setType(ApplicationCommandType.Message),
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        if (
            ![
                "288450828837322764", // SUPERCHIEFYT
            ].includes(i.user.id)
        ) {
            if (!i.member.roles.cache.has(roles.admin)) {
                return r.reply({
                    content:
                        images.commands.profile.bots[
                            Math.floor(
                                Math.random() *
                                    images.commands.profile.bots.length,
                            )
                        ],
                    ephemeral: true,
                });
            }
        }
        return r.showModal({
            customId: `rickroll:${i.targetId}`,
            title: "Send Message",
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        new TextInputBuilder()
                            .setCustomId("should")
                            .setLabel(`Should reply? (y/n)`)
                            .setMinLength(1)
                            .setMaxLength(3)
                            .setRequired(true)
                            .setValue("yes")
                            .setStyle(TextInputStyle.Short),
                    ],
                },
                {
                    type: ComponentType.ActionRow,
                    components: [
                        new TextInputBuilder()
                            .setCustomId("should_ping")
                            .setLabel(`Ping User? (y/n)`)
                            .setMinLength(1)
                            .setMaxLength(3)
                            .setRequired(true)
                            .setValue("yes")
                            .setStyle(TextInputStyle.Short),
                    ],
                },
                {
                    type: ComponentType.ActionRow,
                    components: [
                        new TextInputBuilder()
                            .setCustomId("content")
                            .setLabel("Content")
                            .setMinLength(1)
                            .setMaxLength(4000)
                            .setRequired(true)
                            .setStyle(TextInputStyle.Paragraph),
                    ],
                },
            ],
        });
    },
});
