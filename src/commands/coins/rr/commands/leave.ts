import { buildCommand, type SubCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { EmbedBuilder } from "discord.js";
import { locked, mutableGlobals } from "../../../../utils";

export const leave = buildCommand<SubCommand>({
    subCommand: (b) => b.setName(`leave`).setDescription(`Leave the game`),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.channel || !i.inCachedGuild()) {
            return;
        }
        // Check if the game is currently active
        if (mutableGlobals.rr.active) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "A Russian Roulette game is already in progress. You cannot leave the queue at this time.",
                ),
            );
        }
        if (!mutableGlobals.rr.players.includes(i.user.id)) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(`You're not part of the Russian Roulette game!`),
            );
        }
        // Remove the user from the rrPlayers array
        mutableGlobals.rr.players = mutableGlobals.rr.players.filter(
            (id) => id !== i.user.id,
        );
        const rrPlayersList = mutableGlobals.rr.players
            .map((player) => `<@${player}>`)
            .join(", ");
        const embed = new EmbedBuilder()
            .setTitle(`You have left the Russian Roulette game!`)
            .setColor("#FF897B")
            .setDescription(`Players in the game: ${rrPlayersList}`);
        locked.del(i.user.id);
        await r.edit({ embeds: [embed] });
    },
});
