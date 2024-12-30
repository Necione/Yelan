import type { InviteClient } from "@elara-services/invite";
import type {
    FetchedMemberInvitesResponse,
    getInteractionResponders,
} from "@elara-services/utils";
import {
    embedComment,
    formatNumber,
    get,
    getInteractionResponder,
    is,
    log,
    make,
    noop,
    proper,
    status,
    time,
} from "@elara-services/utils";
import type { sendOptions } from "@elara-services/webhooks";
import { Webhook } from "@elara-services/webhooks";
import { customEmoji, texts } from "@liyueharbor/econ";
import type { Prisma, UserWallet } from "@prisma/client";
import {
    PaginatedMessage,
    type PaginatedMessageOptions,
} from "@sapphire/discord.js-utilities";
import type {
    APIMessage,
    ChatInputCommandInteraction,
    GuildMember,
    MessageCreateOptions,
} from "discord.js";
import {
    Collection,
    CommandInteraction,
    ComponentType,
    User,
} from "discord.js";
import client from "../client";
import {
    channels,
    economy,
    isMainBot,
    mainBotId,
    mainServerId,
} from "../config";
import { getProfileByUserId, updateUserProfile } from "../services";
import { getBotFromId } from "../services/bot";
const webhook = new Webhook(process.env.TOKEN as string);

// eslint-disable-next-line prefer-const
export let inviteCache = new Collection<
    string,
    FetchedMemberInvitesResponse["members"]
>();
// eslint-disable-next-line prefer-const
export let inviteCacheUpdates = {
    last: "",
    next: "",
};
export const tradeTimeout = new Set();
export const mutableGlobals = {
    locked: make.array<{ id: string; name: string; added: number }>(),
    fights: make.array<{ userId: string; createdAt: number }>(),
    rr: {
        reward: 0,
        active: false,
        players: make.array<string>(),
        date: 0,
    },
};

export async function updateInvitesCache(
    invites: InviteClient,
    fromInterval?: boolean,
) {
    const g = await client.guilds.fetch(mainServerId).catch(noop);
    if (!g) {
        return debug(
            `[UPDATE:INVITE:CACHE]: Unable to fetch the main server (${mainServerId})`,
        );
    }
    const r = await invites.fetchAll(g, true, false, (m) => {
        if (
            Date.now() - new Date(m.member.joined_at as string).getTime() >
            get.days(30)
        ) {
            // If the member was invited a month+ ago then ignore.
            return false;
        }
        return true;
    });
    if (!r.status) {
        return debug(r.message);
    }
    if (fromInterval) {
        inviteCacheUpdates.last = new Date().toISOString();
        inviteCacheUpdates.next = new Date(
            Date.now() + get.mins(10),
        ).toISOString();
    }
    inviteCache = invites.formatAll(r.data);
}

export function displayTradeInAction(user: User) {
    return {
        ...embedComment(
            `${user.toString()} can't use any commands while in an active trade.`,
        ),
        ephemeral: true,
    };
}

export function isInActiveTrade(interaction: ChatInputCommandInteraction) {
    const r = getInteractionResponder(interaction);
    if (!interaction.user) {
        return false;
    }
    if (tradeTimeout.has(interaction.user.id)) {
        r.reply(displayTradeInAction(interaction.user));
        return true;
    }
    return false;
}

export async function getTax(amount: number, member: GuildMember) {
    const db = await getBotFromId(mainBotId);
    let fee = 0;
    if (!member.roles.cache.hasAny(...(db?.taxExempt || []))) {
        fee = Math.round(amount * 0.05);
    }
    return fee;
}

export function checkBelowBalance(
    r: getInteractionResponders,
    p: UserWallet,
    amount = 0,
) {
    if (p.balance < amount) {
        r.edit(
            embedComment(
                `<@${p.userId}> is too poor to be gambling\n\n- <@${
                    p.userId
                }>'s balance: ${getAmount(p.balance)}`,
            ),
        );
        return false;
    }
    return true;
}

export function userLockedData(userId: string) {
    return embedComment(
        `🔒 <@${userId}>'s profile is locked due to a breach of the rules or an ongoing investigation. Please do not contact staff regarding this, as it will be unlocked automatically.`,
    );
}

export const locked = {
    set: (i: CommandInteraction | User, cmdName?: string | null) => {
        let user: User | null = null;
        if (i instanceof User) {
            user = i;
        } else if (i instanceof CommandInteraction) {
            user = i.user;
        }
        if (!user?.id) {
            return;
        }
        const find = mutableGlobals.locked.find((c) => c.id === user?.id);
        if (find) {
            if (new Date().getTime() - find.added <= get.mins(1)) {
                return;
            }
            mutableGlobals.locked = mutableGlobals.locked.filter(
                (c) => c.id !== user?.id,
            );
        }
        const name = "commandName" in i ? i.commandName : cmdName || "any";
        mutableGlobals.locked.push({ id: user.id, name, added: Date.now() });
        return;
    },
    has: (userId: string) => {
        const f = mutableGlobals.locked.find((c) => c.id === userId);
        if (f) {
            if (new Date().getTime() - f.added <= get.mins(1)) {
                return f;
            }
        }
        return null;
    },
    del: (userId: string | string[]) => {
        if (is.string(userId)) {
            userId = [userId];
        }
        mutableGlobals.locked = mutableGlobals.locked.filter(
            (c) => !userId.includes(c.id),
        );
    },
};

export async function addRakeback(userId: string, amount: number) {
    const back = Math.floor(amount * economy.commands.rakeback.percent);
    if (back <= 0) {
        // If it's below 0 then don't even request anything.
        return;
    }
    const data: Prisma.UserWalletUpdateInput = {};
    const profile = await getProfileByUserId(userId);
    if (!profile) {
        return;
    }
    if (!profile.rakeback) {
        data.rakeback = { set: { claimed: 0, amount: back } };
    } else {
        data.rakeback = {
            amount: Math.floor(profile.rakeback.amount + back),
            claimed: profile.rakeback.claimed,
        };
    }
    if (!Object.keys(data).length) {
        return;
    }
    return await updateUserProfile(userId, data);
}

export const checks = {
    amount: (p: UserWallet) => {
        if (is.number(p.dailyLimit)) {
            return p.dailyLimit;
        }
        return economy.mora.dailyLimit;
    },

    rig: (p: UserWallet) => {
        return p.rig;
    },

    limit: (p: UserWallet, amount: number) => {
        if (p.daily >= checks.amount(p)) {
            return true;
        }
        const over = Math.floor(p.daily + amount);
        if (over >= checks.amount(p)) {
            return true;
        }
        return false;
    },
    set: (p: UserWallet, amount: number) => {
        const data: Prisma.UserWalletUpdateInput = {};
        if (!is.number(p.daily)) {
            data.daily = { set: amount };
        } else {
            data.daily = { increment: amount };
        }
        return updateUserProfile(p.userId, data);
    },
};

export const cooldowns = {
    get: (p: UserWallet, command: string, customMessage?: string) => {
        const find = p.cooldowns.find((c) => c.command === command);
        if (find) {
            if (Date.now() < find.ends) {
                const msg =
                    customMessage ||
                    `You can't use (\`${command}\`) command again until:\n%DATELONG% (%DURATION%)`;
                const date = new Date(find.ends);
                return status.error(
                    msg
                        .replace(/%DATELONG%/gi, time.long.dateTime(date))
                        .replace(/%DURATION%/gi, time.relative(date)),
                );
            }
        }
        return status.success(`They can use the command again!`);
    },
    set: async (p: UserWallet, command: string, ms: number) => {
        const find = p.cooldowns.find((c) => c.command === command);
        if (find) {
            find.ends = Date.now() + ms;
        } else {
            p.cooldowns.push({ command, ends: Date.now() + ms });
        }
        return await updateUserProfile(p.userId, {
            cooldowns: {
                set: p.cooldowns,
            },
        });
    },

    setMany: async (
        p: UserWallet,
        commands: { command: string; ms: number }[],
        extra: Exclude<Prisma.UserWalletUpdateInput, "cooldowns"> = {},
    ) => {
        for await (const cmd of commands) {
            const find = p.cooldowns.find((c) => c.command === cmd.command);
            if (find) {
                find.ends = Date.now() + cmd.ms;
            } else {
                p.cooldowns.push({
                    command: cmd.command,
                    ends: Date.now() + cmd.ms,
                });
            }
        }
        return await updateUserProfile(p.userId, {
            cooldowns: {
                set: p.cooldowns,
            },
            ...extra,
        });
    },

    del: async (p: UserWallet, command: string) => {
        return await updateUserProfile(p.userId, {
            cooldowns: {
                set: p.cooldowns.filter((c) => c.command !== command),
            },
        });
    },
};

export function getPaginatedMessage(
    options?: PaginatedMessageOptions,
    removeSelectMenu = true,
) {
    const pager = new PaginatedMessage(options);
    if (removeSelectMenu) {
        pager.setActions(
            PaginatedMessage.defaultActions.filter(
                (c) => c.type !== ComponentType.StringSelect,
            ),
        );
    }
    return pager;
}

type logOpt = MessageCreateOptions;
export const logs = {
    handle: (options: sendOptions | logOpt, channelId: string) =>
        send(channelId, options as sendOptions),
    misc: (options: logOpt) => logs.handle(options, channels.logs.misc),
    backup: (options: logOpt) => logs.handle(options, channels.logs.backups),
    fines: (options: logOpt) => logs.handle(options, channels.fines),
    payments: (options: logOpt) => logs.handle(options, channels.logs.payments),
    collectables: (options: logOpt) =>
        logs.handle(options, channels.logs.collectables),
    strikes: (options: logOpt) => logs.handle(options, channels.logs.strikes),
    action: async (
        userId: string,
        amount: number,
        type: "add" | "remove",
        extra?: string,
    ) => {
        return logs.handle(
            {
                content: `>>> [${time.short.time(new Date())}]: ${
                    type === "add"
                        ? "<:plus:1103245217794117652>"
                        : "<:minus:1103245214082142288>"
                } ${proper(type)} <@${userId}> (${userId}) ${getAmount(
                    amount,
                )}${extra ? `\n- Reason: ${extra}` : ""}`,
                allowed_mentions: {
                    parse: [],
                },
            },
            "1193425929230368858",
        );
    },
};

export async function send(
    channelId: string,
    options: sendOptions,
): Promise<APIMessage | null> {
    if (is.array(options.files)) {
        options.files = options.files.map((c) => {
            if ("attachment" in c && c.attachment) {
                c.data = c.attachment as string | Buffer;
            }
            return c;
        });
    }
    let name;
    let icon;
    if (is.object(options.webhook)) {
        if (is.string(options.webhook.name)) {
            name = options.webhook.name;
        }
        if (is.string(options.webhook.icon)) {
            icon = options.webhook.icon;
        }
    }
    if (!name) {
        name = isMainBot ? `Yelan` : `Yelan Development`;
    }
    if (!icon) {
        icon = isMainBot
            ? `https://i.imgur.com/tyHMOSO.png`
            : `https://cdn.discordapp.com/emojis/1168068419380314123.png`;
    }
    return (await webhook
        .send(
            channelId,
            {
                ...options,
                webhook: { name, icon },
            },
            false,
            false,
        )
        .catch(noop)) as APIMessage | null;
}

export function getRandomImage() {
    return `https://lh.elara.workers.dev/random/images/${Math.floor(
        Math.random() * 6,
    )}.png`;
}

export function percentage(num: number, total: number) {
    return (100 * num) / total;
}

export function pricePerc(num: number, perc: number) {
    return (num / 100) * perc;
}

export function getAmount(
    amount: number,
    showEmoji: boolean = true,
    showBacktics: boolean = true,
) {
    return showBacktics
        ? `${showEmoji ? `${customEmoji.a.z_coins} ` : ""}\`${formatNumber(
              amount,
          )} ${texts.c.u}\``
        : `${showEmoji ? `${customEmoji.a.z_coins} ` : ""}${formatNumber(
              amount,
          )} ${texts.c.u}`;
}

export { texts };

export function debug(...args: unknown[]) {
    if (isMainBot) {
        // Do not remove this for the main bot, the logs channel is fucking useless with all of the pointless logs going to it right now.
        // Logging anything to the console should be for locally only not on prod. so stop fucking using console.log/console.error, use this for debugging
        return;
    }
    log(`[DEBUGGER]: `, ...args);
}
