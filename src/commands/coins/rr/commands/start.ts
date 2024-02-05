import { buildCommand, type SubCommand } from "@elara-services/botbuilder";
import { embedComment, get } from "@elara-services/utils";
import { EmbedBuilder } from "discord.js";
import { addBalance, removeBalance } from "../../../../services";
import { customEmoji, locked, mutableGlobals, texts } from "../../../../utils";

export const start = buildCommand<SubCommand>({
    subCommand: (b) => b.setName(`start`).setDescription(`Start the game`),
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
                    "A Russian Roulette game is already in progress. Please wait for it to end.",
                ),
            );
        }

        // Check if there are enough rrPlayers to start the game
        if (mutableGlobals.rr.players.length < 3) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "There aren't enough players to start the Russian Roulette game.\nA minimum of 4 players are required.",
                ),
            );
        }

        // Start the game
        mutableGlobals.rr.active = true;

        // Declare variable to store winning player ID
        let winner;
        mutableGlobals.rr.reward = 100 * mutableGlobals.rr.players.length;

        // Start the elimination timer
        const eliminationTimer = setInterval(async () => {
            if (!i.channel) {
                return;
            }

            // Choose a random player to eliminate
            const index = Math.floor(
                Math.random() * mutableGlobals.rr.players.length,
            );
            const eliminatedPlayer = mutableGlobals.rr.players[index];
            if (!eliminatedPlayer) {
                return;
            }

            // Remove the eliminated player from the rrPlayers array
            mutableGlobals.rr.players.splice(index, 1);
            await removeBalance(
                eliminatedPlayer,
                100,
                true,
                `Via rr start (eliminated)`,
            );
            locked.del(eliminatedPlayer);
            // Check if there is only one player left
            if (mutableGlobals.rr.players.length === 1) {
                const allUsers = new Array(...mutableGlobals.rr.players);
                // Stop the elimination timer
                clearInterval(eliminationTimer);

                // End the game
                mutableGlobals.rr.active = false;

                // Calculate the final rrReward
                await addBalance(
                    mutableGlobals.rr.players[0],
                    mutableGlobals.rr.reward,
                    true,
                    `Via rr start (winner)`,
                ); // Add the accumulated rrReward to the winning player's balance

                // Store winning player ID
                winner = mutableGlobals.rr.players[0];

                // Clear the rrPlayers array
                mutableGlobals.rr.players.length = 0;

                // Send game end message
                const embed = new EmbedBuilder()
                    .setTitle("Game Over")
                    .setDescription(
                        `The game has ended! <@${winner}> has won and earned ${customEmoji.a.z_coins} \`${mutableGlobals.rr.reward} ${texts.c.u}\`!`,
                    );
                await r.send({ embeds: [embed] });
                locked.del(allUsers);
                mutableGlobals.rr.reward = 0;
            } else {
                // Send elimination message
                const embed = new EmbedBuilder()
                    .setTitle("`💥` Elimination")
                    .setDescription(
                        `<@${eliminatedPlayer}> was shot and lost ${customEmoji.a.z_coins} \`100 ${texts.c.u}\`.`,
                    );
                await r.send({ embeds: [embed] });
            }
        }, get.secs(5));

        await r.edit(
            embedComment(
                "The Russian Roulette game has started! Players will be eliminated every 5 seconds. Good luck!",
            ),
        );
    },
});
