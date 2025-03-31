import { addButtonRow, awaitComponent, get, noop } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { getAmount } from "..";
import { getBaseName } from "../../commands/rpg/handlers/utils";
import {
    addItemToInventory,
    removeBalance,
    removeItemFromInventory,
    updateUserStats,
} from "../../services";
import { createEvent } from "./utils";

const forgingPrefixes = ["Demonic", "Corrupted", "Revered"];

export const blacksmith = createEvent({
    name: "blacksmith",
    weight: 1,
    required: {
        min: {
            rank: 20,
            rebirths: 5,
        },
    },
    async execute(message, stats, userWallet) {
        const ids = {
            accept: "event_accept",
            decline: "event_decline",
        };

        if (stats.blacksmith && stats.blacksmith.length > 0) {
            const forgedWeapon = stats.blacksmith[0];
            const added = await addItemToInventory(stats.userId, [
                { item: forgedWeapon, amount: 1 },
            ]);

            await updateUserStats(stats.userId, { blacksmith: { set: [] } });

            return message
                .edit({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("The Blacksmith Returns!")
                            .setDescription(
                                added
                                    ? `The blacksmith has finished forging your weapon! **${forgedWeapon}** has been added to your inventory.`
                                    : `The blacksmith has finished forging your weapon! However, your inventory is full, so **${forgedWeapon}** could not be added.`,
                            )
                            .setColor("Gold"),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        if (!stats.equippedWeapon) {
            return message
                .edit({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("A Blacksmith Appears!")
                            .setDescription(
                                "A skilled blacksmith offers to upgrade your weapon, but you don't have one equipped!",
                            )
                            .setColor("Gold"),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        const embed = new EmbedBuilder()
            .setTitle("A Blacksmith Appears!")
            .setDescription(
                `A skilled blacksmith offers to upgrade your **${
                    stats.equippedWeapon
                }** for ${getAmount(10000)}. Do you accept?`,
            )
            .setColor("Gold");

        await message
            .edit({
                embeds: [embed],
                components: [
                    addButtonRow([
                        {
                            id: ids.accept,
                            label: "Accept",
                            style: ButtonStyle.Success,
                        },
                        {
                            id: ids.decline,
                            label: "Decline",
                            style: ButtonStyle.Danger,
                        },
                    ]),
                ],
            })
            .catch(noop);

        const c = await awaitComponent(message, {
            filter: (int) => int.customId.startsWith("event_"),
            users: [{ allow: true, id: stats.userId }],
            time: get.secs(10),
        });

        if (!c) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "The blacksmith waits for a moment but then continues on his way.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        if (c.customId !== ids.accept) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "You politely decline the blacksmith's offer and continue on your journey.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        if (userWallet.balance < 10000) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `You don't have enough ${customEmoji.a.z_coins} to pay the blacksmith.`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        await removeBalance(stats.userId, 10000, false, "Paid to blacksmith");
        await removeItemFromInventory(stats.userId, stats.equippedWeapon, 1);
        await updateUserStats(stats.userId, {
            equippedWeapon: { set: null },
        });

        const baseWeaponName = getBaseName(stats.equippedWeapon);
        const newPrefix =
            forgingPrefixes[Math.floor(Math.random() * forgingPrefixes.length)];
        const newWeaponName = `${newPrefix} ${baseWeaponName}`;

        await updateUserStats(stats.userId, {
            blacksmith: { set: [newWeaponName] },
        });

        return message
            .edit({
                embeds: [
                    embed.setDescription(
                        `The blacksmith takes your weapon and coins. "I'll have your **${newWeaponName}** ready next time we meet!"`,
                    ),
                ],
                components: [],
            })
            .catch(noop);
    },
});
