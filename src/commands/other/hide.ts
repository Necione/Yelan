import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import {
    awaitComponent,
    embedComment,
    get,
    is,
    time,
} from "@elara-services/utils";
import type { Prisma } from "@prisma/client";
import {
    ComponentType,
    SlashCommandBuilder,
    type StringSelectMenuInteraction,
} from "discord.js";
import { getProfileByUserId, updateUserProfile } from "../../services";
type FieldType = "hidden" | "backgroundHidden" | "frameHidden" | "muteMentions";

export const hide = buildCommand<SlashCommand>({
    aliases: ["toggle"],
    command: new SlashCommandBuilder()
        .setName(`hide`)
        .setDescription("Toggle on/off certain features for you.")
        .setDMPermission(false),
    defer: {
        silent: true, // This has to stay private, do not change it.
    },
    async execute(i, r) {
        const userProfile = await getProfileByUserId(i.user.id);
        if (!userProfile) {
            return r.edit(embedComment("Unable to find your user profile."));
        }
        const emoji = (bool: boolean) => {
            return { id: bool ? "854653108299104256" : "854653108381810688" };
        };
        const m = await r.edit({
            embeds: embedComment(
                `Which features do you want to toggle?\n> Expires ${time.countdown(
                    get.secs(30),
                )}`,
                "Orange",
            ).embeds,
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.StringSelect,
                            custom_id: `toggles`,
                            max_values: 3,
                            min_values: 1,
                            placeholder: "Select features to toggle on/off",
                            options: [
                                {
                                    label: "Hide Background",
                                    value: "backgroundHidden",
                                    emoji: emoji(userProfile.backgroundHidden),
                                },
                                {
                                    label: "Hide Frame",
                                    value: "frameHidden",
                                    emoji: emoji(userProfile.frameHidden),
                                },
                                {
                                    label: "Hide Profile",
                                    value: "hidden",
                                    emoji: emoji(userProfile.hidden),
                                },
                                {
                                    label: "Mute Mentions",
                                    value: "muteMentions",
                                    emoji: emoji(
                                        is.boolean(userProfile.muteMentions)
                                            ? userProfile.muteMentions
                                            : false,
                                    ),
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        if (!m) {
            return;
        }
        const c = await awaitComponent<StringSelectMenuInteraction>(m, {
            custom_ids: [{ id: "toggles" }],
            users: [{ allow: true, id: i.user.id }],
            time: get.secs(30),
        });
        if (!c) {
            return r.edit(
                embedComment(
                    `You failed to provide anything to toggle, command canceled`,
                ),
            );
        }
        const data: Prisma.UserWalletUpdateInput = {};
        const desc = [];
        for (const field of c.values as FieldType[]) {
            const set = userProfile[field] ? false : true;
            data[field] = { set };
            desc.push(
                `- \`${field}\` is now set to: ${set ? "Enabled" : "Disabled"}`,
            );
        }
        await updateUserProfile(i.user.id, data);
        return r.edit(embedComment(desc.join("\n"), "Green"));
    },
});
