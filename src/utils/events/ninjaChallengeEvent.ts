import { addButtonRow, awaitComponent, get, noop } from "@elara-services/utils";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { startHunt } from "../../commands/rpg/handlers/huntHandler";
import { updateUserStats } from "../../services";
import { createEvent } from "./utils";

export const ninjaChallenge = createEvent({
    name: "ninjaChallenge",
    weight: 2,
    required: {
        min: {
            rank: 20,
            rebirths: 4,
        },
    },
    async execute(message, stats) {
        const ids = {
            accept: "event_acceptChallenge",
            deny: "event_denyChallenge",
        };

        const embed = new EmbedBuilder()
            .setTitle("A Mysterious Ninja Challenges You!")
            .setDescription(
                "A shadowy figure appears and issues a challenge to test your skills. Do you accept the ninja's challenge?",
            )
            .setColor("DarkPurple");

        await message.edit({
            embeds: [embed],
            components: [
                addButtonRow([
                    {
                        id: ids.accept,
                        label: "Accept Challenge",
                        style: ButtonStyle.Success,
                    },
                    {
                        id: ids.deny,
                        label: "Deny Challenge",
                        style: ButtonStyle.Danger,
                    },
                ]),
            ],
        });

        const interaction = await awaitComponent(message, {
            filter: (ii) => ii.customId.startsWith("event_"),
            users: [{ allow: true, id: stats.userId }],
            time: get.secs(15),
        });

        if (!interaction) {
            await updateUserStats(stats.userId, { hp: { set: 0 } });

            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `You failed to respond in time. In shame, you perform **Seppuku** and lose all your HP.`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        if (interaction.customId === ids.deny) {
            await updateUserStats(stats.userId, { hp: { set: 0 } });

            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `You chose to deny the ninja's challenge. Overcome by honor, you perform **Seppuku** and lose all your HP.`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        if (interaction.customId === ids.accept) {
            if (
                stats.isHunting ||
                stats.isTravelling ||
                stats.hp <= 0 ||
                stats.abyssMode
            ) {
                return message
                    .edit({
                        embeds: [
                            embed.setDescription(
                                "You are currently unable to accept the ninja's challenge due to your current state.",
                            ),
                        ],
                        components: [],
                    })
                    .catch(noop);
            }

            await message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "You accept the ninja's challenge! Prepare yourself for battle...",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);

            if (
                "send" in message.channel &&
                typeof message.channel.send === "function"
            ) {
                const ninjaTypes = [
                    "Kairagi: Fiery Might",
                    "Kairagi: Dancing Thunder",
                ];
                const randomNinja =
                    ninjaTypes[Math.floor(Math.random() * ninjaTypes.length)];

                const fightEmbed = new EmbedBuilder()
                    .setDescription(
                        `A **${randomNinja}** appears to face you in battle!`,
                    )
                    .setColor("DarkPurple");

                const fightMessage = await message.channel
                    .send({
                        embeds: [fightEmbed],
                    })
                    .catch(noop);

                if (fightMessage) {
                    await startHunt(fightMessage, interaction.user, [
                        randomNinja,
                    ]);
                }
            } else {
                await message.reply(
                    "Unable to start the battle due to channel limitations.",
                );
            }

            return;
        }

        await message
            .edit({
                embeds: [
                    embed.setDescription(
                        "An unexpected error occurred. Please try again later.",
                    ),
                ],
                components: [],
            })
            .catch(noop);
    },
});
