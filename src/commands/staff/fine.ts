import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, formatNumber, is, noop } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { devId, roles } from "../../config";
import { removeBalance } from "../../services";
import { logs } from "../../utils";

export const fine = buildCommand<SlashCommand>({
    locked: {
        roles: roles.main,
    },
    command: new SlashCommandBuilder()
        .setName(`fine`)
        .setDescription(`[ADMIN]: Fine someone`)
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
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(2000),
        )
        .addBooleanOption((o) =>
            o
                .setName(`dm`)
                .setDescription(`Should I dm them the reason? (Default: True)`)
                .setRequired(false),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const user = i.options.getUser("user", true);
        const amount = i.options.getInteger("amount", true);
        const reason = i.options.getString("reason", true);
        let dm = i.options.getBoolean("dm", false);
        if (!is.boolean(dm)) {
            dm = true;
        }
        if (user.bot) {
            return r.edit(embedComment(`Bots don't have a user profile.`));
        }
        if (i.user.id !== devId && user.id === devId) {
            return r.edit(embedComment(`Respectfully, fuck off.`));
        }
        if (user.id === i.user.id) {
            return r.edit(embedComment(`You can't fine yourself.`));
        }
        if (!is.number(amount)) {
            return r.edit(embedComment(`The amount you provided is invalid.`));
        }
        await removeBalance(
            user.id,
            amount,
            false,
            `Via a fine issued by \`@${i.user.username}\` (${i.user.id})\nReason: ${reason}`,
        );
        if (dm) {
            await user
                .send(
                    embedComment(
                        `You've been fined for ${
                            customEmoji.a.z_coins
                        } \`${formatNumber(amount)} ${
                            texts.c.u
                        }\`\n- Reason: ${reason}`,
                        Colors.Red,
                    ),
                )
                .catch(noop);
        }

        await logs.fines({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setTitle("Fine Issued")
                    .setAuthor({
                        name: `@${user.username} (${user.id})`,
                        iconURL: user.displayAvatarURL(),
                    })
                    .setFooter({
                        text: `By: @${i.user.username} (${i.user.id})`,
                        iconURL: i.user.displayAvatarURL(),
                    })
                    .addFields([
                        {
                            name: `Amount`,
                            value: `${customEmoji.a.z_coins} \`${formatNumber(
                                amount,
                            )} ${texts.c.u}\``,
                        },
                        {
                            name: "Reason",
                            value: reason,
                        },
                    ]),
            ],
        });

        return r.edit(
            embedComment(
                `✅ Fined ${user.toString()} for ${
                    customEmoji.a.z_coins
                } \`${formatNumber(amount)} ${texts.c.u}\``,
                "Green",
            ),
        );
    },
});
