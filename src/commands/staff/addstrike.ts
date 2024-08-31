import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, formatNumber, log } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { roles } from "../../config";
import {
    getProfileByUserId,
    removeBalance,
    updateUserProfile,
} from "../../services";

export const addStrike = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("addstrike")
        .setDescription("[STAFF] Add a strike to a user")
        .setDMPermission(false)
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user you want to strike")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("The reason for the strike")
                .setRequired(true),
        ),
    defer: { silent: true },
    locked: {
        roles: [roles.moderator],
    },
    async execute(i) {
        if (!i.inCachedGuild()) return;

        const user = i.options.getUser("user", true);
        const reason = i.options.getString("reason", true);

        const profile = await getProfileByUserId(user.id);
        if (!profile) {
            return i.editReply(
                embedComment("Unable to find/create user profile."),
            );
        }

        const updatedStrikes = (profile.strikes || 0) + 1;
        const fineAmount = updatedStrikes * 200;
        await updateUserProfile(user.id, { strikes: updatedStrikes });

        await removeBalance(
            user.id,
            fineAmount,
            false,
            `Fine for strike ${updatedStrikes} issued by staff. Reason: ${reason}`,
        );

        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(0xff5856)
                .setTitle("You have received a strike")
                .setDescription(
                    `You have been given a strike by a staff member for the following reason:\n\n**${reason}**\n\nAs a result, you have been fined ${customEmoji.a.z_coins} \`${formatNumber(fineAmount)} ${texts.c.u}\`.`,
                )
                .setFooter({
                    text: "This strike was issued anonymously by a staff member.",
                });

            await user.send({ embeds: [dmEmbed] });
        } catch (error) {
            log("Failed to send a DM to the user", error);
        }

        return i.editReply(
            embedComment(
                `${user.toString()} has been given a strike and fined ${customEmoji.a.z_coins} \`${formatNumber(fineAmount)} ${texts.c.u}\`.`,
            ),
        );
    },
});
