import { addButtonRow, awaitComponent, get, noop } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { getAmount } from "..";
import { removeBalance, updateUserStats } from "../../services";
import { createEvent } from "./utils";

const cost = 200;

export const oldWizard = createEvent({
    name: "oldWizard",
    weight: 1,
    required: {
        min: {
            rank: 20,
            rebirths: 3,
        },
    },
    async execute(message, stats, userWallet) {
        const ids = {
            accept: "event_accept",
            decline: "event_decline",
        };

        const embed = new EmbedBuilder()
            .setTitle("An Old Wizard Approaches!")
            .setDescription(
                `An elderly wizard with a long white beard approaches you. He claims he can perform a miracle for you in exchange for ${getAmount(
                    cost,
                )}.\n\nDo you accept his offer?`,
            )
            .setColor("Purple");

        await message
            .edit({
                embeds: [embed],
                components: [
                    addButtonRow([
                        {
                            id: ids.accept,
                            label: "Accept",
                            style: ButtonStyle.Primary,
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
            filter: (ii) => ii.customId.startsWith("event_"),
            users: [{ allow: true, id: stats.userId }],
            time: get.secs(30),
        });

        if (!c) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "The wizard waits for a moment but then continues on his way.",
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
                            "You politely decline the wizard's offer and continue on your journey.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        if (userWallet.balance < cost) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `You don't have enough ${customEmoji.a.z_coins} to pay the wizard.`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        await removeBalance(stats.userId, cost, false, "Paid to old wizard");

        const outcome = Math.random();
        if (outcome < 0.25) {
            const newMaxCastQueue = stats.maxCastQueue + 1;
            await updateUserStats(stats.userId, {
                maxCastQueue: newMaxCastQueue,
            });

            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `The wizard performs his miracle! Your maximum spell queue size has been permanently increased by 1!`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        } else if (outcome < 0.5) {
            const newBonusHp = (stats.bonusHp || 0) + 25;
            await updateUserStats(stats.userId, {
                bonusHp: newBonusHp,
            });

            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            `The wizard performs his miracle! Your Max HP has been permanently increased by 25!`,
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        } else {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "The wizard performs his miracle... but nothing seems to happen. He shrugs and walks away.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }
    },
});
