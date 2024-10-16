import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import {
    ChannelType,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { locked } from "../../utils";

export const abyss = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("abyss")
        .setDescription("[RPG] Toggle Abyss Mode.")
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);

        if (!i.deferred) {
            locked.del(i.user.id);
            return;
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "No stats found for you, please set up your profile.",
                ),
            );
        }

        if (stats.isTravelling) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "You cannot toggle Abyss Mode while you are travelling!",
                ),
            );
        }

        if (stats.isHunting) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("You cannot toggle Abyss Mode while hunting!"),
            );
        }

        const newAbyssMode = !stats.abyssMode;

        await updateUserStats(i.user.id, {
            abyssMode: newAbyssMode,
        });

        const status = newAbyssMode ? "enabled" : "disabled";
        let responseMessage = `You have **${status}** Abyss Mode.`;

        if (!i.guild) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("This command can only be used in a server."),
            );
        }

        const guild = i.guild;
        const categoryId = "1290188539828633600";
        const channelName = `abysspriv-${i.user.username}`;
        const extraChannelId = "1295945026253226044";

        if (newAbyssMode) {
            const category = guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment("The Abyss category does not exist."),
                );
            }

            try {
                const channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: categoryId,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: i.user.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                        },
                    ],
                });

                responseMessage += `\nA private channel has been created for you: ${channel}`;

                await channel.send({
                    content: `${i.user}`,
                    embeds: [
                        {
                            description:
                                "You have entered the Abyss. This is your private channel to run abyss-related commands in, please utilize this instead of the normal channels.",
                        },
                    ],
                });

                const extraChannel = guild.channels.cache.get(extraChannelId);
                if (
                    extraChannel &&
                    extraChannel.type === ChannelType.GuildText
                ) {
                    await extraChannel.permissionOverwrites.edit(i.user.id, {
                        ViewChannel: true,
                    });
                } else {
                    console.error(
                        "Extra channel does not exist or is not a text channel.",
                    );
                }

                await r.edit(embedComment(responseMessage, "Green"));
            } catch (error) {
                console.error("Error creating channel:", error);
                responseMessage += `\nFailed to create the private channel.`;

                await r.edit(embedComment(responseMessage, "Red"));
            }
        } else {
            const abyssChannel = guild.channels.cache.find(
                (c) =>
                    c.name === channelName &&
                    c.type === ChannelType.GuildText &&
                    c.parentId === categoryId,
            );

            if (abyssChannel) {
                responseMessage += `\nYour Abyss channel will be deleted.`;
            } else {
                responseMessage += `\nNo Abyss channel found to delete.`;
            }

            const extraChannel = guild.channels.cache.get(extraChannelId);
            if (extraChannel && extraChannel.type === ChannelType.GuildText) {
                await extraChannel.permissionOverwrites
                    .delete(i.user.id)
                    .catch((error) => {
                        console.error(
                            "Error removing user's permissions from extra channel:",
                            error,
                        );
                    });
            } else {
                console.error(
                    "Extra channel does not exist or is not a text channel.",
                );
            }

            await r.edit({
                embeds: [
                    {
                        description: responseMessage,
                    },
                ],
            });

            if (abyssChannel) {
                try {
                    await abyssChannel.delete();
                } catch (error) {
                    console.error("Error deleting channel:", error);
                }
            }
        }

        locked.del(i.user.id);
    },
});
