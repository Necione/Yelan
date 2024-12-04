import type { SlashCommand } from "@elara-services/botbuilder";
import {
    embedComment,
    formatNumber,
    get,
    is,
    sleep,
    time,
} from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { economy, roles } from "../../config";
import { getProfileByUserId } from "../../services";
import {
    cooldowns,
    getAmount,
    locked,
    logs,
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
        const list: { command: string; ms: number }[] = [];
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
                list.push({
                    command: "highroller",
                    ms: economy.boost.claim.time,
                });
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
                list.push({ command: "claim", ms: economy.boost.claim.time });
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
        await Promise.all([
            cooldowns.setMany(data, list, {
                balance: {
                    increment: amount,
                },
            }),
            logs.action(
                interaction.user.id,
                amount,
                "add",
                `Via: ${claim.command.name}`,
            ),
            logs.misc(
                embedComment(
                    `${interaction.user.toString()} (${
                        interaction.user.id
                    }) claimed \`${formatNumber(amount)} ${
                        texts.c.u
                    }\` via \`/claim\`\n- Perks: ${
                        isBooster ? "\n - Booster" : ""
                    }${
                        isHighRoller ? "\n - High Roller" : ""
                    }\n> Next claim: ${time.countdown(
                        economy.boost.claim.time,
                    )}`,
                    "Aqua",
                ),
            ),
        ]);
        await responder.edit(
            embedComment(
                `You've claimed ${getAmount(
                    amount,
                )}, you can claim more ${time.countdown(
                    economy.boost.claim.time,
                )}!`,
                "Green",
            ),
        );
        await sleep(get.secs(5)); // Wait 5s before removing their locked from the system.
        locked.del(interaction.user.id);
    },
};
