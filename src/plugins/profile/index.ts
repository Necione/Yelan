import {
    addButtonRow,
    embedComment,
    getInteractionResponder,
    noop,
} from "@elara-services/utils";
import {
    ActionRowBuilder,
    ButtonStyle,
    ComponentType,
    TextInputBuilder,
    TextInputStyle,
    type RepliableInteraction,
} from "discord.js";
import { loadImage } from "skia-canvas";
import { getProfileByUserId, updateUserProfile } from "../../services";
import { allowedDomains, createCanvasProfile } from "./utils";

export async function onInteraction(interaction: RepliableInteraction) {
    if (!interaction.inCachedGuild()) {
        return;
    }
    if (!("customId" in interaction)) {
        return;
    }
    if (!interaction.customId.startsWith("profile|")) {
        return;
    }
    const responder = getInteractionResponder(interaction);
    const [, type, deferType] = interaction.customId.split("|");
    switch (type) {
        case "reset_background": {
            await responder.defer({ ephemeral: true });
            const p = await getProfileByUserId(interaction.user.id);
            if (!p) {
                return responder.edit(
                    embedComment(`I was unable to find your profile.`),
                );
            }
            if (!p.backgroundUrl) {
                return responder.edit(
                    embedComment(
                        `You don't have a custom background set, there is nothing for you to reset.`,
                    ),
                );
            }
            await updateUserProfile(interaction.user.id, {
                backgroundUrl: "",
            });
            return responder.edit(
                embedComment(
                    `Your profile background image is now reset.`,
                    "Green",
                ),
            );
        }

        case "custom_background": {
            return responder.showModal({
                customId: `profile|set_background${
                    deferType ? `|${deferType}` : ""
                }`,
                title: "Set Custom Background",
                components: [
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                        new TextInputBuilder()
                            .setCustomId("url")
                            .setLabel("URL")
                            .setRequired(false)
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder(
                                `Enter your imgur URL or just press 'Submit' with nothing to reset your background!`,
                            ),
                    ),
                ],
            });
        }

        case "backround_confirm": {
            if (!interaction.message) {
                return responder.reply({
                    ...embedComment(
                        `I was unable to find the message you used this on.`,
                    ),
                    ephemeral: true,
                });
            }
            await responder.deferUpdate();
            const p = await getProfileByUserId(interaction.user.id);
            if (!p) {
                return responder.edit(
                    embedComment(`I was unable to find your profile.`),
                );
            }
            const url =
                interaction.message.components[0].components.find(
                    (c) =>
                        c.data.type === ComponentType.Button &&
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (c.data as any).label === "Image",
                    // @ts-ignore
                )?.data.url || "";
            if (!url) {
                return responder.edit(
                    embedComment(
                        `I was unable to find the image url, try again?`,
                    ),
                );
            }
            if (
                !url.match(new RegExp(allowedDomains.join("|"), "gi")) ||
                !url.match(/.(png|jpg|jpeg|webp)/gi)
            ) {
                return responder.edit(
                    embedComment(
                        `You failed to provide a valid image url.\n__Valid Domains__\n${allowedDomains.join(
                            "\n",
                        )}\n> OR it doesn't include a \`.png, .jpg, .jpeg, .webp\`\n> If you're trying \`.gif\` it will not work.`,
                    ),
                );
            }

            await updateUserProfile(interaction.user.id, {
                backgroundUrl: url,
            });

            return responder.edit(
                embedComment(
                    `I've set your background image to: \`${url}\``,
                    "Green",
                ),
            );
        }

        case "set_background": {
            if (!interaction.isModalSubmit()) {
                return;
            }
            if (deferType) {
                await responder.deferUpdate();
            } else {
                await responder.defer({ ephemeral: true });
            }
            const p = await getProfileByUserId(interaction.user.id);
            if (!p) {
                return responder.edit(
                    embedComment(`I was unable to find your profile.`),
                );
            }
            const url = interaction.fields.getTextInputValue("url");
            if (!url) {
                await updateUserProfile(interaction.user.id, {
                    backgroundUrl: "",
                });
                return responder.edit(
                    embedComment(`I've reset your background URL!`, "Green"),
                );
            }
            if (!url.match(/https:\/\//gi)) {
                return responder.edit(
                    embedComment(`The url you tried to provide isn't valid.`),
                );
            }
            if (
                !url.match(new RegExp(allowedDomains.join("|"), "gi")) ||
                !url.match(/.(png|jpg|jpeg|webp)/gi)
            ) {
                return responder.edit(
                    embedComment(
                        `You failed to provide a valid image url.\n__Valid Domains__\n${allowedDomains.join(
                            "\n",
                        )}\n> OR it doesn't include a \`.png, .jpg, .jpeg, .webp\`\n> If you're trying \`.gif\` it will not work.`,
                    ),
                );
            }
            const imageData = await loadImage(url).catch(noop);
            if (!imageData) {
                return responder.edit(
                    embedComment(
                        `You provided an invalid image (I couldn't get the data for the image, make sure it's valid)`,
                    ),
                );
            }

            return responder.edit({
                files: [
                    {
                        name: "profile.png",
                        attachment: await createCanvasProfile(
                            interaction.user,
                            p,
                            interaction.guildId,
                            url,
                        ),
                    },
                ],
                components: [
                    addButtonRow([
                        {
                            id: `profile|backround_confirm`,
                            label: "Confirm",
                            style: ButtonStyle.Success,
                        },
                        {
                            id: `profile|custom_background|edit`,
                            label: "Edit",
                            style: ButtonStyle.Secondary,
                        },
                        { label: "Image", url },
                    ]),
                ],
            });
        }
    }
}
