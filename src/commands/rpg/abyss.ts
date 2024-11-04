import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
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

        locked.del(i.user.id);
        return r.edit(
            embedComment("The Spiral Abyss is currently closed and resetting"),
        );
        /*
        const userWallet = await getProfileByUserId(i.user.id);
        if (!userWallet) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to find/create your user profile."),
            );
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

        if (stats.worldLevel < 10) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    `You need to be at least World Level 10 to enter the Abyss.`,
                    "Red",
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

        if (newAbyssMode) {
            const cooldownKey = "abyss";
            const cc = cooldowns.get(userWallet, cooldownKey);
            if (!cc.status) {
                locked.del(i.user.id);
                return r.edit(embedComment(cc.message));
            }

            const abyssCooldown = get.hrs(1);
            await cooldowns.set(userWallet, cooldownKey, abyssCooldown);
        }

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
        const categoryId = "1290188539828633600";
        const channelName = `abysspriv-${i.user.username}`;
        const extraChannelId = "1295945026253226044";

        if (newAbyssMode) {
            const category = i.guild.channels.resolve(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment("The Abyss category does not exist."),
                );
            }

            const channel = await i.guild.channels
                .create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: categoryId,
                    permissionOverwrites: [
                        {
                            id: i.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: i.user.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                        },
                    ],
                })
                .catch((e) => new Error(e));
            if (channel instanceof Error) {
                responseMessage += `\nFailed to create the private channel.`;
                return r.edit(embedComment(responseMessage));
            }

            responseMessage += `\nA private channel has been created for you: ${channel}`;

            const extraChannel = i.guild.channels.resolve(extraChannelId);
            if (extraChannel && extraChannel.type === ChannelType.GuildText) {
                await extraChannel.permissionOverwrites
                    .edit(i.user.id, {
                        ViewChannel: true,
                    })
                    .catch(noop);
            }

            await channel
                .send({
                    content: i.user.toString(),
                    embeds: [
                        {
                            description:
                                "You have entered the Abyss. This is your private channel to run movement commands in, please utilize this channel for </move:1295986595383611412>. You can also use </whereami:1295986595383611414> to see your current location.",
                        },
                    ],
                })
                .catch(noop);

            await r.edit(embedComment(responseMessage, "Green"));
        } else {
            const abyssChannel = i.guild.channels.cache.find(
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

            const extraChannel = i.guild.channels.resolve(extraChannelId);
            if (extraChannel && extraChannel.type === ChannelType.GuildText) {
                await extraChannel.permissionOverwrites
                    .delete(i.user.id)
                    .catch((error) => {
                        console.error(
                            "Error removing user's permissions from extra channel:",
                            error,
                        );
                    });
            }

            await r.edit({
                embeds: [
                    {
                        description: responseMessage,
                    },
                ],
            });

            if (abyssChannel) {
                await abyssChannel.delete().catch(noop);
            }
        }

        locked.del(i.user.id);
            */
    },
});
