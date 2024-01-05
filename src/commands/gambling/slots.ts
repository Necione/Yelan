import type { SlashCommand } from "@elara-services/botbuilder";
import { get, sleep, time } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { channels } from "../../config";
import { clearSlotsPrizePool, getProfileByUserId, getSlots, handleBets, removeBalance } from "../../services";
import { addRakeback, checks, embedComment, locked, texts, userLockedData } from "../../utils";
import { embeds, playSlot, renderSlotDisplay } from "../../utils/slots";

export const slots: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("slots")
        .setDescription(`Play slots and win ${texts.c.l}`)
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setRequired(false)
                .setName("bet")
                .addChoices(
                    { name: "100", value: "100" },
                    { name: "250", value: "250" },
                    { name: "500", value: "500" },
                    { name: "750", value: "750" },
                    { name: "1000", value: "1000" },
                )
                .setDescription(`Amount of ${texts.c.l} to play the slots`),
        ),
    only: { threads: true },
    defer: { silent: false },
    locked: {
        channels: [
            ...channels.gamblingcommands,
            ...channels.testingbotcommands,
        ]
    },
    async execute(interaction, responder) {
        if (!interaction.deferred) {
            return;
        }
        locked.set(interaction);
        await sleep(Math.floor(Math.random() * (3000 - 200 + 1) + 200)); // DO NOT REMOVE THIS.
        const betArg = interaction.options.get("bet");
        if (!betArg) {
            const slots = await getSlots();
            let lastWonBy = "Nobody";
            if (slots.lastClaimedUserId && slots.lastClaimedAt) {
                lastWonBy = `<@${slots.lastClaimedUserId}> at ${time.short.dateTime(
                    slots.lastClaimedAt,
                )}`;
            }
            locked.del(interaction.user.id);
            return responder.edit({
                embeds: [embeds.description(slots.prizePool, lastWonBy)],
            });
        }

        const bet = parseInt(betArg.value as string);
        const profile = await getProfileByUserId(interaction.user.id);
        if (profile.locked) {
            locked.del(interaction.user.id);
            return responder.edit(userLockedData(interaction.user.id));
        }
        if (profile.balance < bet) {
            locked.del(interaction.user.id);
            return responder.edit({ embeds: [embeds.tooPoor(profile.balance)] });
        }
        if (checks.limit(profile, bet)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(`This command could not be completed. This is not a bug.`),
            );
        }
        await removeBalance(interaction.user.id, bet);

        const slotResult = await playSlot(bet);
        for await (const i of [0, 1, 2, 3]) {
            await sleep(get.secs(0.5));
            await responder.edit({
                embeds: [
                    embeds.play(
                        renderSlotDisplay(
                            slotResult.result.slotDisplay,
                            i as 0 | 1 | 2 | 3,
                        ),
                    ),
                ],
            });
        }

        if (slotResult.status === "jackpot") {
            await clearSlotsPrizePool(interaction.user.id);
            await handleBets(interaction.user.id, slotResult.result.winAmount, bet);
            await checks.set(profile, slotResult.result.winAmount);
        }

        if (slotResult.status === "win") {
            await handleBets(interaction.user.id, slotResult.result.winAmount, bet);
            await checks.set(profile, slotResult.result.winAmount);
        }

        if (slotResult.status === "draw") {
            await handleBets(interaction.user.id, bet, bet);
            await checks.set(profile, bet);
        }
        await addRakeback(interaction.user.id, Math.floor(bet));

        const profileAfterSlot = await getProfileByUserId(interaction.user.id);
        locked.del(interaction.user.id);
        return await responder.edit({
            embeds: [
                embeds.result(
                    slotResult,
                    interaction.user.id,
                    profileAfterSlot.balance,
                ),
            ],
        });
    },
};
