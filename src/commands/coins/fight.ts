import {
    addButtonRow,
    embedComment,
    formatNumber,
    get,
    is,
} from "@elara-services/utils";
import { type UserWallet } from "@prisma/client";
import {
    ButtonStyle,
    Colors,
    EmbedBuilder,
    SlashCommandBuilder,
    type User,
} from "discord.js";

import type { SlashCommand } from "@elara-services/botbuilder";
import { customEmoji, texts } from "@liyueharbor/econ";
import { economy } from "../../config";
import { addBalance, getProfileByUserId, removeBalance } from "../../services";
import { checks, locked, mutableGlobals, userLockedData } from "../../utils";

/**
 * A adjustable chance of getting an accident
 * @param chance 0 to 1
 */
function getRandomAccident(
    chance = 0.1,
): "NO_ACCIDENT" | { msg: string; loss: number } {
    // Math.random() is [0, 1)
    const rand = Math.random();

    // Force Math.random to be (0, 1)
    if (rand === 0) {
        return "NO_ACCIDENT";
    }

    if (rand > chance) {
        return "NO_ACCIDENT";
    }

    const accidents = [
        {
            msg: "You guys was not watching where you are fighting. A car went by and hit both of you.",
            loss: 15,
        },
        {
            msg: "Think it was a good idea to use grenade in a fist fight? Think again.\nBoth of you are sent to hospital",
            loss: 30,
        },
        {
            msg: "A gangster showed up and asked both of you to pay protection.",
            loss: 25,
        },
        {
            msg: `Looz came and interrupted the fight, goodbye ${texts.c.u}`,
            loss: 10,
        },
        {
            msg: "One of you tried to use a weapon in the fist fight, the fight ended prematurely",
            loss: 10,
        },
        {
            msg: "Error: Unknown exception occured.\nReason: ||Boom shaka laka||",
            loss: 30,
        },
        {
            msg: "A wild Neci spawned! Somehow both of you ended the fight in peace",
            loss: -10,
        },
        {
            msg: "Both your parents found out that you are fighting, both of you get grounded for 1 month",
            loss: 50,
        },
        {
            msg: "Instead of fighting, you guys decided to date each other.",
            loss: -10,
        },
        {
            msg: "You are an idiot ||https://www.youtube.com/watch?v=hiRacdl02w4||",
            loss: 10,
        },
    ];

    return accidents[Math.floor(Math.random() * accidents.length)];
}

function embedOnlyReply(embed: EmbedBuilder) {
    return {
        content: "",
        embeds: [embed],
        components: [],
    };
}

const embeds = {
    FIGHT_BOT: () =>
        embedOnlyReply(
            new EmbedBuilder()
                .setTitle("Invalid user")
                .setDescription("This wouldn't end well anyway...")
                .setColor(Colors.Red),
        ),
    SELF_FIGHT: () =>
        embedOnlyReply(
            new EmbedBuilder()
                .setTitle("Invalid user")
                .setDescription(
                    "Why are you hitting yourself, why are you hitting yourself",
                )
                .setColor(Colors.Red),
        ),
    INVALID_AMT: () =>
        embedOnlyReply(
            new EmbedBuilder()
                .setTitle("Invalid amount")
                .setDescription("Fight amount needs to be more than 0")
                .setColor(Colors.Red),
        ),
    BET_LIMIT_REACHED: (betLimit: number) =>
        embedOnlyReply(
            new EmbedBuilder()
                .setTitle("Invalid amount")
                .setDescription(
                    `Bet limit has been capped at ${customEmoji.a.z_coins} \`${betLimit} ${texts.c.u}\``,
                )
                .setColor(Colors.Red),
        ),
    INSUFFICIENT_BAL: (user: UserWallet, isOpponent = false) =>
        embedOnlyReply(
            new EmbedBuilder()
                .setTitle("Invalid amount")
                .setDescription(
                    `${
                        isOpponent ? "Your opponent" : "You"
                    } do not have enough ${texts.c.u} to fight
  
Balance: ${customEmoji.a.z_coins} \`${formatNumber(user.balance)} ${
                        texts.c.u
                    }\``,
                )
                .setColor(Colors.Red),
        ),
    REQUEST_FIGHT: (
        requestorUserId: string,
        amount: number,
        opponent: User,
    ) => {
        const embed = new EmbedBuilder()
            .setTitle("`👊` Fist Fight")
            .setColor(Colors.Orange)
            .setDescription(`<@${requestorUserId}> has requested to fight you for ${
            customEmoji.a.z_coins
        } \`${formatNumber(amount)} ${texts.c.u}\`
    
Do you accept the fight?`);
        return {
            content: `<@${opponent.id}>`,
            embeds: [embed],
            components: [
                addButtonRow([
                    {
                        id: "fight",
                        label: "Fight",
                        emoji: "🤜",
                        style: ButtonStyle.Success,
                    },
                    {
                        id: "reject",
                        label: "Reject",
                        style: ButtonStyle.Danger,
                    },
                    {
                        id: "cancel",
                        label: "Cancel",
                        style: ButtonStyle.Secondary,
                    },
                ]),
            ],
        };
    },
    FIGHT_IN_PROGRESS: () =>
        embedOnlyReply(
            new EmbedBuilder()
                .setTitle("`👊` Fist Fight")
                .setColor(Colors.Orange)
                .setDescription("Both players are fist fighting..."),
        ),
    REJECTED: (opponent: User) =>
        embedOnlyReply(
            new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("`👊` Fight Rejected")
                .setDescription(
                    `Your opponent <@${opponent.id}> refused to fight`,
                ),
        ),
    ACCIDENT: (msg: string, loss: number) =>
        embedOnlyReply(
            new EmbedBuilder()
                .setTitle(`Oh no${loss < 0 ? "?" : "!"}`)
                .setColor(Colors.Red).setDescription(`${msg}

Both of you ${loss < 0 ? "won?" : "lost"} ${customEmoji.a.z_coins} \`${
                loss < 0 ? -loss : loss
            } ${texts.c.u}\``),
        ),
    FIGHT_ENDED: (
        winnerUser: UserWallet,
        winAmount: number,
        loserUser: UserWallet,
    ) =>
        embedOnlyReply(
            new EmbedBuilder()
                .setTitle("`👊` Fight Ended")
                .setDescription(
                    `<@${winnerUser.userId}> has won ${
                        customEmoji.a.z_coins
                    } \`${formatNumber(winAmount)} ${texts.c.u}\` from <@${
                        loserUser.userId
                    }>`,
                )
                .setColor(Colors.Green),
        ),
    FIGHT_CANCELED: (reason: string) =>
        embedOnlyReply(
            new EmbedBuilder()
                .setTitle("`👊` Fight Canceled")
                .setColor(Colors.Red)
                .setDescription(reason),
        ),
};

export const fight: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName(`fight`)
        .setDescription(
            `Fight another person for 50/50 chance of winning ${texts.c.u}`,
        )
        .setDMPermission(false)
        .addUserOption((option) =>
            option
                .setRequired(true)
                .setName("user")
                .setDescription("Your opponent"),
        )
        .addNumberOption((option) =>
            option
                .setRequired(true)
                .setName("amount")
                .setDescription(`Amount of ${texts.c.u} to fight for`),
        ),
    defer: { silent: false },
    execute: async (interaction, responder) => {
        locked.set(interaction);

        const opponent = interaction.options.getUser("user", true);
        const amount = interaction.options.getNumber("amount", true);
        if (locked.has(opponent.id)) {
            locked.del(interaction.user.id);
            return responder.edit(
                embedComment(
                    `${opponent.toString()} is currently waiting for a command to finish.`,
                ),
            );
        }
        // Check if user is currently in fight
        if (
            mutableGlobals.fights.find((x) => x.userId === interaction.user.id)
        ) {
            return responder.edit("You are currently in another fight.");
        }
        if (mutableGlobals.fights.find((x) => x.userId === opponent.id)) {
            locked.del([interaction.user.id, opponent.id]);
            return responder.edit(
                "Your opponent are currently in another fight.",
            );
        }
        if (!amount) {
            locked.del([interaction.user.id, opponent.id]);
            return;
        }
        locked.set(opponent, interaction.commandName);
        const fighter = interaction.user;
        const endFight = () => {
            mutableGlobals.fights = mutableGlobals.fights.filter(
                (x) => ![interaction.user.id, opponent.id].includes(x.userId),
            );
            locked.del([interaction.user.id, opponent.id]);
        };

        // Validations
        if (opponent.bot) {
            endFight();
            return responder.edit(embeds.FIGHT_BOT());
        }
        if (opponent.id === interaction.user.id) {
            endFight();
            return responder.edit(embeds.SELF_FIGHT());
        }
        if (!is.number(amount, true)) {
            endFight();
            return responder.edit(embeds.INVALID_AMT());
        }

        const flooredAmount = Math.floor(amount);
        if (flooredAmount > economy.fightBetLimit) {
            endFight();
            return responder.edit(
                embeds.BET_LIMIT_REACHED(economy.fightBetLimit),
            );
        }

        const user1 = await getProfileByUserId(interaction.user.id);
        const user2 = await getProfileByUserId(opponent.id);
        if (user1.locked) {
            endFight();
            return responder.edit(userLockedData(interaction.user.id));
        }
        if (user2.locked) {
            endFight();
            return responder.edit(userLockedData(opponent.id));
        }

        if (checks.limit(user1, flooredAmount)) {
            endFight();
            return responder.edit(
                embedComment(`You've reached your daily coin earning limit.`),
            );
        }
        if (checks.limit(user2, flooredAmount)) {
            endFight();
            return responder.edit(
                embedComment(`You've reached your daily coin earning limit.`),
            );
        }

        if (user1.balance <= flooredAmount) {
            endFight();
            return responder.edit(embeds.INSUFFICIENT_BAL(user1));
        }
        if (user2.balance <= flooredAmount) {
            endFight();
            return responder.edit(embeds.INSUFFICIENT_BAL(user2, true));
        }

        // Functions for starting and ending fights
        // endFight needs to be called whenever interaction is replied
        const startFight = () => {
            mutableGlobals.fights.push(
                {
                    userId: interaction.user.id,
                    createdAt: Date.now(),
                },
                {
                    userId: opponent.id,
                    createdAt: Date.now(),
                },
            );
        };

        startFight();
        const response = await responder.edit(
            embeds.REQUEST_FIGHT(interaction.user.id, flooredAmount, opponent),
        );
        if (!response) {
            endFight();
            return;
        }

        const collector = response.createMessageComponentCollector({
            filter: (i) =>
                !i.user.bot &&
                [interaction.user.id, opponent.id].includes(i.user.id),
            time: get.mins(1),
        });

        let fighterResponded = false;
        let opponentResponded = false;

        collector.on("collect", async (interaction) => {
            await interaction.deferUpdate();
            // Validation
            const isFighter = interaction.user.id === fighter.id;
            const isOpponent = interaction.user.id === opponent.id;

            if (fighterResponded || opponentResponded) {
                return;
            }

            if (isFighter && interaction.customId === "cancel") {
                fighterResponded = true;
                endFight();
                return void responder.edit(
                    embeds.FIGHT_CANCELED(
                        `<@${interaction.user.id}> wuss out the fight.`,
                    ),
                );
            }

            if (isOpponent && interaction.customId === "reject") {
                opponentResponded = true;
                endFight();
                return void responder.edit(embeds.REJECTED(opponent));
            }
            if (isOpponent && interaction.customId === "fight") {
                opponentResponded = true;
                await responder.edit(embeds.FIGHT_IN_PROGRESS());
                const accident = getRandomAccident();
                if (accident !== "NO_ACCIDENT") {
                    await Promise.all([
                        removeBalance(
                            user1.userId,
                            accident.loss,
                            false,
                            `Via ${fight.command.name}`,
                        ),
                        removeBalance(
                            user2.userId,
                            accident.loss,
                            false,
                            `Via ${fight.command.name}`,
                        ),
                    ]);
                    endFight();
                    return void responder.edit(
                        embeds.ACCIDENT(accident.msg, accident.loss),
                    );
                }

                const user1ShouldWin = user1.yay === true;
                const user2ShouldWin = user2.yay === true;

                // Determine the winner based on the specified role
                let winnerUser: UserWallet;
                let loserUser: UserWallet;

                if (user1ShouldWin) {
                    winnerUser = user1;
                    loserUser = user2;
                } else if (user2ShouldWin) {
                    winnerUser = user2;
                    loserUser = user1;
                } else {
                    if (Math.random() >= 0.5) {
                        winnerUser = user1;
                        loserUser = user2;
                    } else {
                        winnerUser = user2;
                        loserUser = user1;
                    }
                }

                try {
                    await Promise.all([
                        removeBalance(
                            loserUser.userId,
                            flooredAmount,
                            false,
                            `Via ${fight.command.name}`,
                        ),
                        addBalance(
                            winnerUser.userId,
                            flooredAmount,
                            false,
                            `Via ${fight.command.name}`,
                        ),
                        checks.set(winnerUser, flooredAmount),
                    ]);
                    endFight();
                    return void responder.edit(
                        embeds.FIGHT_ENDED(
                            winnerUser,
                            flooredAmount,
                            loserUser,
                        ),
                    );
                } catch (e) {
                    endFight();
                    return void responder.edit(
                        embeds.FIGHT_CANCELED("Insufficient balance to fight"),
                    );
                }
            }
        });

        collector.on("end", () => {
            endFight();
            if (fighterResponded || opponentResponded) {
                return;
            }
            return void responder.edit(
                embeds.FIGHT_CANCELED(
                    "Your opponent did not respond to the fight.",
                ),
            );
        });
    },
};
