import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, formatNumber, is, noop } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { SlashCommandBuilder } from "discord.js";
import { roles } from "../../config";
import { addBalance } from "../../services";
import { logs } from "../../utils";

export const payment = buildCommand<SlashCommand>({
    locked: {
        roles: [...roles.main, roles.management.econ, roles.payroll],
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
        ),
    defer: { silent: false },
    async execute(i, r) {
        const user = i.options.getUser("user", true);
        const amount = i.options.getInteger("amount", true);
        const reason = i.options.getString("reason", false) || "your position";
        if (user.bot) {
            return r.edit(embedComment(`Bots don't have a user profile.`));
        }
        if (user.id === i.user.id) {
            return r.edit(embedComment(`You can't pay yourself.`));
        }
        if (!is.number(amount)) {
            return r.edit(embedComment(`The amount you provided is invalid.`));
        }
        await addBalance(
            user.id,
            amount,
            false,
            `Via admin pay: \`@${i.user.username}\` (${i.user.id})\nReason: ${reason}`,
            false,
        );

        await logs.payments(
            embedComment(
                `### Payment\n- From: \`${i.user.username}\` (${
                    i.user.id
                })\n- To: \`${user.username}\` (${user.id})\n- Amount: ${
                    customEmoji.a.z_coins
                } \`${formatNumber(amount)} ${texts.c.u}\`\n- For: ${reason}`,
                "Green",
            ),
        );
        const dmed = await user
            .send(
                embedComment(
                    `You were paid ${customEmoji.a.z_coins} \`${formatNumber(
                        amount,
                    )} ${texts.c.u}\` for:\n>>> ${reason}`,
                    "Green",
                ),
            )
            .catch(noop);
        return r.edit(
            embedComment(
                `${customEmoji.a.z_coins} Paid (${formatNumber(amount)}) ${
                    texts.c.u
                } to ${user.toString()}${
                    dmed ? `` : `\n> They weren't messaged about getting paid`
                }`,
                "Green",
            ),
        );
    },
});
