import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    SlashCommandBuilder,
} from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    updateUserStats,
} from "../../services";
import { locked } from "../../utils";
import { handleAbyssHunt } from "./handlers/abyssHandler";

export const abyss = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("abyss")
        .setDescription("[RPG] Continue down the abyss.")
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);

        if (!i.deferred) {
            return;
        }

        const message = await i.fetchReply().catch(noop);
        if (!message) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to fetch the original message."),
            );
        }

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
                    "You cannot go on a hunt while you are travelling!",
                ),
            );
        }

        if (stats.isHunting) {
            locked.del(i.user.id);
            return r.edit(embedComment("You are already hunting!"));
        }

        if (stats.hp <= 0) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("You don't have enough HP to go on a hunt :("),
            );
        }

        const corruptionLevel = stats.abyssFloor || 0;
        const damageReduction = corruptionLevel * 1;

        const confirmationEmbed = {
            color: 0xff0000,
            title: "The Abyss Beckons",
            description: `*"The deeper you stare into the abyss, the deeper the abyss stares back."*\n\nYou will not be able to heal during Abyss runs.`,
            fields: [
                {
                    name: "Abyss Level",
                    value: `**${stats.abyssFloor}**`,
                    inline: true,
                },
                {
                    name: "Corruption Level",
                    value: `You will deal **${damageReduction}%** less damage in the next Abyss floor.`,
                    inline: true,
                },
            ],
        };

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("confirm_abyss")
                .setLabel("Proceed")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("cancel_abyss")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary),
        );

        await i.editReply({ embeds: [confirmationEmbed], components: [row] });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 10000,
        });

        collector.on("collect", async (interaction) => {
            if (interaction.user.id !== i.user.id) {
                return interaction.reply({
                    content: "This is not your action to confirm!",
                    ephemeral: true,
                });
            }

            if (interaction.customId === "confirm_abyss") {
                await updateUserStats(i.user.id, { isHunting: true });
                await handleAbyssHunt(i, message, stats, userWallet);
                locked.del(i.user.id);

                await interaction.update({ components: [] });
            } else if (interaction.customId === "cancel_abyss") {
                locked.del(i.user.id);
                await interaction.update({
                    content: "You decided to turn away from the Abyss.",
                    components: [],
                    embeds: [],
                });
            }
        });

        collector.on("end", async () => {
            try {
                await i.editReply({
                    components: [],
                });
            } catch (error) {
                console.error("Error disabling buttons after timeout:", error);
            }
        });
    },
});
