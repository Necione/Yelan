import { embedComment, is } from "@elara-services/utils";
import type {
    MessageCreateOptions,
    MessagePayload,
    ModalSubmitInteraction,
} from "discord.js";

export async function onRickRoll(interaction: ModalSubmitInteraction) {
    if (!interaction.channel || !interaction.customId.startsWith("rickroll:")) {
        return;
    }
    await interaction.deferReply({ ephemeral: true }).catch(() => null);
    const [, id] = interaction.customId.split(":");
    const content = interaction.fields.getTextInputValue("content");
    const should = interaction.fields.getTextInputValue("should");
    const should_ping = interaction.fields.getTextInputValue("should_ping");
    const data: MessagePayload | MessageCreateOptions = {
        content,
        allowedMentions: {
            repliedUser: ["yes", "ye", "y"].includes(should_ping)
                ? true
                : false,
        },
    };
    if (["yes", "ye", "y"].includes(should)) {
        data["reply"] = {
            messageReference: id,
            failIfNotExists: false,
        };
    }
    if (is.string(data.content) && data.content.length > 2000) {
        delete data.content;
        data["embeds"] = embedComment(content, "DarkButNotBlack").embeds;
    }
    await interaction.channel.send(data).catch(() => null);
    return interaction.deleteReply().catch(() => null);
}
