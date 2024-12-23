import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import {
    colors,
    discord,
    embedComment,
    formatNumber,
    get,
    is,
    make,
    noop,
    sleep,
} from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder, type User } from "discord.js";
import { isDev, roles } from "../../config";
import { addBalance } from "../../services";
import { getAmount, logs } from "../../utils";

export const payment = buildCommand<SlashCommand>({
    locked: {
        roles: [...roles.main, roles.management.econ, ...roles.payroll],
    },
    command: new SlashCommandBuilder()
        .setName(`payment`)
        .setDescription(`[ADMIN]: Pay someone`)
        .setDMPermission(false)
        .addUserOption((o) =>
            o.setName(`user`).setDescription(`What user?`).setRequired(true),
        )
        .addIntegerOption((o) =>
            o
                .setName(`amount`)
                .setDescription(`How much?`)
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(99999999999999),
        )
        .addStringOption((o) =>
            o
                .setName(`reason`)
                .setDescription(`For what reason?`)
                .setRequired(false)
                .setMinLength(1)
                .setMaxLength(2000),
        )
        .addStringOption((o) =>
            o
                .setName(`other_users`)
                .setDescription(
                    `What is the other users? (mentions/ids separated by a space)`,
                )
                .setRequired(false),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const user = i.options.getUser("user", true);
        const amount = i.options.getInteger("amount", true);
        const reason = i.options.getString("reason", false) || "your position";
        const ousers = i.options.getString("other_users", false) || "";
        if (!is.number(amount)) {
            return r.edit(embedComment(`The amount you provided is invalid.`));
        }
        const users = make.array<User>([user]);
        if (user.bot) {
            return r.edit(embedComment(`Bots don't have a user profile.`));
        }
        if (!isDev(i.user.id) && user.id === i.user.id) {
            return r.edit(embedComment(`You can't pay yourself.`));
        }
        await r.edit(
            embedComment(
                `${customEmoji.a.loading} Fetching all of the users...`,
                "Orange",
            ),
        );
        if (is.string(ousers)) {
            for await (const id of ousers.split(/ |></g)) {
                const u = await discord.user(
                    i.client,
                    id.replace(/<|@|>/g, ""),
                    {
                        fetch: true,
                        mock: false,
                    },
                );
                if (!u || u.bot) {
                    continue;
                }
                if (users.find((c) => c.id === u.id)) {
                    continue;
                }
                if (user.id === i.user.id) {
                    if (!isDev(i.user.id)) {
                        continue;
                    }
                }
                users.push(u);
            }
        }
        if (!is.array(users)) {
            return r.edit(
                embedComment(`You provided no users to send the payment to.`),
            );
        }
        const status = make.array<string>();
        await r.edit(
            embedComment(
                `${customEmoji.a.loading} Adding ${getAmount(
                    amount,
                )} to (${formatNumber(
                    users.length,
                )}) users balance and sending the DMs, one moment...`,
                "Yellow",
            ),
        );
        for await (const c of users) {
            await r.edit(
                embedComment(
                    `${
                        customEmoji.a.z_arrow_blue
                    } Paying ${c.toString()} and DMing them...`,
                    colors.purple,
                ),
            );
            await addBalance(
                c.id,
                amount,
                false,
                `Via admin pay: \`@${i.user.username}\` (${i.user.id})\nReason: ${reason}`,
                false,
            );
            await logs.payments(
                embedComment(
                    `### Payment\n- From: \`${i.user.username}\` (${
                        i.user.id
                    })\n- To: \`${c.username}\` (${
                        c.id
                    })\n- Amount: ${getAmount(amount)}\n- For: ${reason}`,
                    "Green",
                ),
            );
            const dmed = await c
                .send(
                    embedComment(
                        `You were paid ${getAmount(
                            amount,
                        )} for:\n>>> ${reason}`,
                        "Green",
                    ),
                )
                .catch(noop);
            status.push(`\`${dmed ? "🟢" : "🔴"}\` ${c.toString()}`);
            await r.edit(
                embedComment(
                    `${customEmoji.a.z_check} Paid ${c.toString()} and ${
                        dmed ? "DMed them!" : "couldn't DM them. 😔"
                    }`,
                    "Green",
                ),
            );
            await sleep(get.secs(1.5));
        }
        if (!is.array(status)) {
            return r.edit(embedComment(`No status on the dms...?`));
        }
        return r.edit(
            embedComment(
                `${customEmoji.a.z_coins} Paid (${formatNumber(amount)}) ${
                    texts.c.u
                } to:\n${status.join("\n")}`,
                "Green",
            ),
        );
    },
});
