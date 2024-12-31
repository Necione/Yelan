import { addButtonRow, awaitComponent, get, noop } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { getAmount } from "..";
import { startHunt } from "../../commands/rpg/handlers/huntHandler";
import { removeBalance } from "../../services";
import { createEvent } from "./utils";

export const thief = createEvent({
    name: "thief",
    weight: 1,
    required: {
        min: {
            rank: 5,
            rebirths: 1,
        },
    },
    async execute(message, stats) {
        const ids = {
            catch: "event_catch",
            ignore: "event_ignore",
        };

        const coinsLost = Math.floor(Math.random() * 201) + 100;

        const embed = new EmbedBuilder()
            .setTitle("A Thief Appears!")
            .setDescription(
                `While traveling, a thief suddenly appears and attempts to steal ${getAmount(
                    coinsLost,
                )} from you! Do you want to try and catch him?`,
            )
            .setColor("Red");

        await message.edit({
            embeds: [embed],
            components: [
                addButtonRow([
                    {
                        id: ids.catch,
                        label: "Catch the Thief",
                        style: ButtonStyle.Success,
                    },
                    {
                        id: ids.ignore,
                        label: "Let Him Go",
                        style: ButtonStyle.Danger,
                    },
                ]),
            ],
        });

        const c = await awaitComponent(message, {
            filter: (ii) => ii.customId.startsWith("event_"),
            users: [{ allow: true, id: stats.userId }],
            time: get.secs(10),
        });

        if (!c) {
            await removeBalance(
                stats.userId,
                coinsLost,
                false,
                "Stolen by Thief",
            );
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `You hesitate and the thief gets away with ${customEmoji.a.z_coins} \`${coinsLost} Coins\`!`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        if (c.customId === ids.ignore) {
            await removeBalance(
                stats.userId,
                coinsLost,
                false,
                "Stolen by Thief",
            );
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `You decide not to chase the thief. He steals ${customEmoji.a.z_coins} \`${coinsLost} Coins\` from you!`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

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
                            "You are unable to chase the thief right now due to your current state.",
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
                        "You decide to catch the thief! A battle ensues...",
                    ),
                ],
                components: [],
            })
            .catch(noop);

        if (
            "send" in message.channel &&
            typeof message.channel.send === "function"
        ) {
            const thiefMonsters = [
                "Treasure Hoarder Crusher",
                "Treasure Hoarder Gravedigger",
                "Treasure Hoarder Marksman",
                "Treasure Hoarder Potioneer",
            ];
            const randomThiefMonster =
                thiefMonsters[Math.floor(Math.random() * thiefMonsters.length)];

            const msg = await message.channel
                .send({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(
                                `You engage the thief in battle against a **${randomThiefMonster}**!`,
                            )
                            .setColor("Red"),
                    ],
                })
                .catch(noop);

            if (msg) {
                await startHunt(
                    msg,
                    c.user,
                    [randomThiefMonster],
                    undefined,
                    true,
                );
            }
        } else {
            await message.reply(
                "Unable to start the battle due to channel limitations.",
            );
        }
    },
});
