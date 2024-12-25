import { buildCommand, type SubCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import { EmbedBuilder } from "discord.js";
import { getProfileByUserId } from "../../../../services";
import {
    getAmount,
    locked,
    mutableGlobals,
    userLockedData,
} from "../../../../utils";

export const join = buildCommand<SubCommand>({
    subCommand: (b) => b.setName(`join`).setDescription(`Join the game`),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.channel || !i.inCachedGuild()) {
            return;
        }
        // Check if the game is currently active, before fetching from the database.
        if (mutableGlobals.rr.active) {
            if (Date.now() < mutableGlobals.rr.date) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment(
                        "A Russian Roulette game is already in progress, please wait for it to end.",
                    ),
                );
            }
            mutableGlobals.rr.active = false;
            mutableGlobals.rr.date = 0;
            mutableGlobals.rr.players.length = 0;
            mutableGlobals.rr.reward = 0;
        }

        // Check if they're already part of the game, if so don't fetch them from the database.
        if (mutableGlobals.rr.players.includes(i.user.id)) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    `You're already part of the Russian Roulette game!\n> Use (\`/rr leave\`) to leave the game!`,
                ),
            );
        }
        const dk = await getProfileByUserId(i.user.id);
        if (dk.locked) {
            locked.del(i.user.id);
            return r.edit(userLockedData(dk.userId));
        }
        const balance = dk.balance ?? 0;
        if (balance < 100) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    `You need at least \`100 ${texts.c.u}\` to join the Russian Roulette game!`,
                ),
            );
        }

        mutableGlobals.rr.players.push(i.user.id);
        mutableGlobals.rr.reward = 100 * mutableGlobals.rr.players.length;
        const rrPlayersList = mutableGlobals.rr.players
            .map((player) => `<@${player}>`)
            .join(", ");
        const embed = new EmbedBuilder()
            .setColor(0x7bff85)
            .setTitle(`You have joined the next Russian Roulette game!`)
            .setDescription(
                `Players in the game: ${rrPlayersList}\nCurrent Reward: ${getAmount(
                    mutableGlobals.rr.reward,
                )}`,
            );
        locked.del(i.user.id);
        return r.edit({ embeds: [embed] });
    },
});
