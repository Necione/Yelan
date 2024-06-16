import type { SlashCommand } from "@elara-services/botbuilder";
import {
    embedComment,
    formatNumber,
    get,
    is,
    sleep,
    time,
} from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { economy, roles } from "../../config";
import {
    addBalance,
    checkBalanceForLimit,
    getProfileByUserId,
} from "../../services";
import {
    cooldowns,
    customEmoji,
    isInActiveTrade,
    locked,
    logs,
    texts,
    userLockedData,
} from "../../utils";

export const claim: SlashCommand = {
    locked: { roles: [economy.boost.role, roles.highRoller, ...roles.main] },
    command: new SlashCommandBuilder()
        .setName(`claim`)
        .setDescription(`Claim the weekly booster reward or High Roller perk`)
        .setDMPermission(false),
    defer: {
        silent: false,
    },
    execute: async (interaction, responder) => {
        if (!interaction.inCachedGuild()) {
            return;
        }
        if (isInActiveTrade(interaction)) {
            return;
        }
        const has = (ids: string[]) =>
            interaction.member.roles.cache.hasAny(...ids);
        locked.set(interaction);
        const data = await getProfileByUserId(interaction.user.id);
        if (data.locked) {
            locked.del(interaction.user.id);
            return responder.edit(userLockedData(interaction.user.id));
        }
        const isHighRoller = has([roles.highRoller, ...roles.main]);
        const isBooster = has([economy.boost.role, ...roles.main]);
        const messages = [];
        const promises = [];
        let amount = 0;
        if (isHighRoller) {
            const hasCooldown = cooldowns.get(
                data,
                "highroller",
                `⌚ You've already claimed your High Roller perk for this week, try again %DURATION%`,
            );
            if (!hasCooldown.status) {
                messages.push(hasCooldown.message);
            } else {
                amount += economy.commands.claim.highRoller;
                promises.push(
                    cooldowns.set(data, "highroller", economy.boost.claim.time),
                );
            }
        }
        if (isBooster) {
            const hasCooldown = cooldowns.get(
                data,
                "claim",
                `⌚ You've already claimed your Booster perk this week, try again %DURATION%`,
            );
            if (!hasCooldown.status) {
                messages.push(hasCooldown.message);
            } else {
                amount += economy.boost.claim.amount;
                promises.push(
                    cooldowns.set(data, "claim", economy.boost.claim.time),
                );
            }
        }
        if (!is.number(amount)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(
                    messages.length
                        ? messages.join("\n")
                        : `Unable to find the amount of ${texts.c.u} to claim.`,
                ),
            );
        }
        const r = checkBalanceForLimit(data, amount);
        if (!r.status) {
            locked.del(interaction.user.id);
            return responder.edit(embedComment(r.message));
        }
        await Promise.all([
            ...promises,
            addBalance(
                interaction.user.id,
                amount,
                true,
                `Via: ${claim.command.name}`,
            ),
        ]);
        await logs.misc(
            embedComment(
                `${interaction.user.toString()} (${
                    interaction.user.id
                }) claimed \`${formatNumber(amount)} ${
                    texts.c.u
                }\` via \`/claim\`\n- Perks: ${
                    isBooster ? "\n - Booster" : ""
                }${
                    isHighRoller ? "\n - High Roller" : ""
                }\n> Next claim: ${time.countdown(economy.boost.claim.time)}`,
                "Aqua",
            ),
        );
        await responder.edit(
            embedComment(
                `You've claimed ${customEmoji.a.z_coins} \`${formatNumber(
                    amount,
                )}\` ${texts.c.u}, you can claim more ${time.countdown(
                    economy.boost.claim.time,
                )}!`,
                "Green",
            ),
        );
        await sleep(get.secs(2)); // Wait 2s before removing their locked from the system.
        locked.del(interaction.user.id);
    },
};
