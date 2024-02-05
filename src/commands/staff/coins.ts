import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, formatNumber, is } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { updateUserProfile } from "../../services";
import { customEmoji, texts } from "../../utils";

export const coins = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`coins`)
        .setDescription(`Manage coins for a user`)
        .setDMPermission(false)
        .addUserOption((o) =>
            o.setName(`user`).setDescription(`What user?`).setRequired(true),
        )
        .addIntegerOption((o) =>
            o
                .setName(`amount`)
                .setDescription(`What's the amount?`)
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(99999999999999),
        )
        .addStringOption((o) =>
            o
                .setName(`type`)
                .setDescription(`Which type? (default: Add)`)
                .setRequired(false)
                .addChoices(
                    { name: "Add", value: "increment" },
                    { name: "Remove", value: "decrement" },
                ),
        ),
    defer: { silent: true },
    async execute(i, r) {
        const user = i.options.getUser("user", true);
        const amount = i.options.getInteger("amount", true);
        const type = (i.options.getString("type", false) || "increment") as
            | "increment"
            | "decrement";
        const str = `${customEmoji.a.z_coins} \`${formatNumber(amount)} ${
            texts.c.u
        }\``;
        if (user.bot) {
            return r.edit(embedComment(`Bots don't have a user profile.`));
        }
        if (!is.number(amount)) {
            return r.edit(embedComment(`You provided an invalid amount.`));
        }
        await updateUserProfile(user.id, {
            balance: {
                [type]: amount,
            },
        });
        return r.edit(
            embedComment(
                `✅ I've ${type === "increment" ? "given" : "removed"} ${str} ${
                    type === "increment" ? "to" : "from"
                } ${user.toString()} (${user.id})`,
                "Green",
            ),
        );
    },
});
