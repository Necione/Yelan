import {
    formatNumber,
    get,
    getInteractionResponders,
    is,
    status,
    time,
} from "@elara-services/utils";
import type { Prisma, UserWallet } from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    CommandInteraction,
    ComponentEmojiResolvable,
    EmbedBuilder,
    InteractionReplyOptions,
    MessageActionRowComponentBuilder,
    User,
} from "discord.js";
import { getProfileByUserId, updateUserProfile } from "../services";
import { economy } from "../config";

export const mutableGlobals = {
    locked: [] as { id: string; name: string; added: number }[],
};

export const texts = {
    c: {
        // Currency
        l: "coins", // Lowercase
        u: "Coins", // Propercase
        s: "Coin", // Single version of the currency name.
    },
} as const;

export const customEmoji = {
    a: {
        loading: "<a:loading:1184700865303552031>",
        seven: "<a:seven:1107185113403494443>",
        z_lemon: "<a:z_lemon:1091219658973138995>",
        questionMark: "<a:questionMark:1091216008364171344>",
        z_diamond: "<a:z_diamond:1090830675210420274>",
        z_tokens: "<a:z_tokens:1090831147824586852>",
        z_repute: "<a:z_repute:1090831334735347802>",
        z_coins: "<a:z_coins:1090830835516702850>",
        z_elo: "<a:z_elo:1121633552019243028>",
        z_info: "<a:z_info:1090837991808839680>",
        z_check: "<a:z_check:1090852465546637422>",
        slotSpinAnimation: "<a:spin_animation:1112480565967470592>",
        z_lemon_id: "1091219658973138995",
        z_mail: "<a:mail:1172701817877049455>",
        z_arrow_blue: "<a:950183798463672351:1119087306867998750>",
        z_bell: "<a:z_bell:1093235143185018961>",
        z_arrow_branch: "<:Arrow:1090792035411316736>",
    },
    na: {},
};

export function embedComment(
    str: string,
    color: keyof typeof Colors | number = "Red",
    components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [],
    files: InteractionReplyOptions["files"] = [],
) {
    return {
        content: "",
        embeds: [
            new EmbedBuilder()
                .setDescription(str)
                .setColor(typeof color === "number" ? color : Colors[color]),
        ],
        components,
        files,
    };
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
                }>'s balance: ${customEmoji.a.z_coins} \`${formatNumber(
                    p.balance,
                )} ${texts.c.u}\``,
            ),
        );
        return false;
    }
    return true;
}

export function commandLimitRep(
    r: getInteractionResponders,
    p: UserWallet,
    amount = 3,
) {
    if (p.staffCredits < amount) {
        r.edit(
            embedComment(
                `<@${p.userId}> doesn't have enough user reputation.\nGain reputation through quests in </quests:1091189719875977282>\n- Required Reputation: +${amount}\n- <@${p.userId}>'s Reputation: ${p.staffCredits}`,
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
        locked.scan();
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
        }
        const name = "commandName" in i ? i.commandName : cmdName || "any";
        mutableGlobals.locked.push({ id: user.id, name, added: Date.now() });
        return;
    },
    has: (userId: string) => {
        locked.scan();
        const f = mutableGlobals.locked.find((c) => c.id === userId);
        if (f) {
            if (new Date().getTime() - f.added <= get.mins(1)) {
                return f;
            }
        }
        return null;
    },
    del: (userId: string) => {
        mutableGlobals.locked = mutableGlobals.locked.filter(
            (c) => c.id !== userId,
        );
        locked.scan();
    },
    delMany: (users: string[]) => {
        mutableGlobals.locked = mutableGlobals.locked.filter(
            (c) => !users.includes(c.id),
        );
        locked.scan();
        return true;
    },
    scan: () => {
        if (!mutableGlobals.locked.length) {
            return false;
        }
        const remove = [];
        for (const user of mutableGlobals.locked) {
            if (new Date().getTime() - user.added >= get.mins(1)) {
                remove.push(user.id);
            }
        }

        if (is.array(remove)) {
            locked.delMany(remove);
        }
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
export interface ButtonOptions {
    label?: string;
    style?: ButtonStyle;
    emoji?: ComponentEmojiResolvable;
    id?: string;
    url?: string;
    disabled?: boolean;
}
export function addButton(options: ButtonOptions) {
    const button = new ButtonBuilder();
    if (options.id) {
        button.setCustomId(options.id);
    }
    if (options.url) {
        button.setURL(options.url).setStyle(ButtonStyle.Link);
    } else if (options.style) {
        button.setStyle(options.style);
    }

    if (options.label) {
        button.setLabel(options.label);
    }
    if (options.emoji) {
        button.setEmoji(options.emoji);
    }
    if (is.boolean(options.disabled)) {
        button.setDisabled(options.disabled);
    }
    if (!button.data.label && !button.data.emoji) {
        button.setEmoji("🤔"); // This only happens if there is no label or emoji to avoid erroring out the command.
    }
    return button;
}

export function addButtonRow(options: ButtonOptions | ButtonOptions[]) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    if (Array.isArray(options) && options.length) {
        for (const option of options) {
            row.addComponents(addButton(option));
        }
    } else if (is.object(options)) {
        row.addComponents(addButton(options as ButtonOptions));
    }
    return row;
}

export const cooldowns = {
    get: (p: UserWallet, command: string, customMessage?: string) => {
        const find = p.cooldowns.find((c) => c.command === command);
        if (find) {
            if (Date.now() < find.ends) {
                const msg =
                    customMessage ||
                    `You can't use (\`${command}\`) command again until:\n> %DATELONG% (%DURATION%)`;
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
};
