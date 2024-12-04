import { buildCommand, type SubCommand } from "@elara-services/botbuilder";
import { embedComment, get } from "@elara-services/utils";
import { EmbedBuilder } from "discord.js";
import { addBalance, removeBalance } from "../../../../services";
import { getAmount, locked, mutableGlobals } from "../../../../utils";

export const start = buildCommand<SubCommand>({
    subCommand: (b) => b.setName(`start`).setDescription(`Start the game`),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.channel || !i.inCachedGuild()) {
            return;
        }
        // Check if the game is currently active
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

        // Check if there are enough rrPlayers to start the game
        if (mutableGlobals.rr.players.length <= 3) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "There aren't enough players to start the Russian Roulette game.\nA minimum of 4 players are required.",
                ),
            );
        }

        // Start the game
        mutableGlobals.rr.active = true;
        mutableGlobals.rr.date = Date.now() + get.mins(2); // Set the date to 2 minutes in the future, as a backup just in case something bugs out.

        // Declare variable to store winning player ID
        const reward = 100 * mutableGlobals.rr.players.length;
        mutableGlobals.rr.reward = reward;
        const allUsers = new Array(...mutableGlobals.rr.players);

        // Start the elimination timer
        const eliminationTimer = setInterval(async () => {
            if (!i.channel) {
                return;
            }
            if (!mutableGlobals.rr.players.length) {
                // If for some reason it reaches 0 users then just reset everything
                clearInterval(eliminationTimer);
                mutableGlobals.rr.players.length = 0;
                mutableGlobals.rr.reward = 0;
                mutableGlobals.rr.active = false;
                mutableGlobals.rr.date = 0;
                return;
            }
            const eliminatedPlayer =
                mutableGlobals.rr.players[
                    Math.floor(Math.random() * mutableGlobals.rr.players.length)
                ];
            if (!eliminatedPlayer) {
                return;
            }

            // Remove the eliminated player from the rrPlayers array
            mutableGlobals.rr.players = mutableGlobals.rr.players.filter(
                (c) => c !== eliminatedPlayer,
            );
            await removeBalance(
                eliminatedPlayer,
                100,
                true,
                `Via rr start (eliminated)`,
            );
            locked.del(eliminatedPlayer);
            // Check if there is only one player left
            if (mutableGlobals.rr.players.length === 1) {
                // Stop the elimination timer
                clearInterval(eliminationTimer);
                const winner = mutableGlobals.rr.players[0];

                // End the game
                mutableGlobals.rr.active = false;
                mutableGlobals.rr.reward = 0;
                mutableGlobals.rr.date = 0;
                mutableGlobals.rr.players.length = 0;

                // Calculate the final rrReward
                await addBalance(winner, reward, true, `Via rr start (winner)`);
                // Send game end message
                const embed = new EmbedBuilder()
                    .setTitle("Game Over")
                    .setDescription(
                        `The game has ended! <@${winner}> has won and earned ${getAmount(
                            reward,
                        )}!`,
                    );
                await r.send({ embeds: [embed] });
                locked.del(allUsers);
                mutableGlobals.rr.reward = 0;
            } else {
                // Send elimination message
                const embed = new EmbedBuilder()
                    .setTitle("`💥` Elimination")
                    .setDescription(
                        `<@${eliminatedPlayer}> was shot and lost ${getAmount(
                            100,
                        )}.`,
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
