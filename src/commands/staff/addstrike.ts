import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { roles } from "../../config";
import { getProfileByUserId, updateUserProfile } from "../../services";

export const addstrike = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("addstrike")
        .setDescription("[STAFF] Add a strike to a user")
        .setDMPermission(false)
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to add a strike to")
                .setRequired(true),
        ),
    defer: { silent: true },
    locked: {
        roles: [roles.moderator],
    },
    async execute(i) {
        if (!i.inCachedGuild()) {
            return;
        }
        const user = i.options.getUser("user", true);
        if (user.bot) {
            return i.editReply(embedComment(`Bots can't receive strikes.`));
        }

        const p = await getProfileByUserId(user.id);
        if (!p) {
            return i.editReply(embedComment(`Unable to find/create user profile.`));
        }
        if (p.locked) {
            return i.editReply(embedComment(`${user.toString()}'s user profile is locked.`));
        }

        const newStrikes = (p.strikes || 0) + 1;

        const updateResult = await updateUserProfile(user.id, {
            strikes: newStrikes,
        });

        if (!updateResult) {
            return i.editReply(embedComment(`Failed to update strikes for ${user.toString()}.`));
        }

        return i.editReply(
            embedComment(`Added a strike to ${user.toString()}.\nThey now have ${newStrikes} strike(s).`, "Red"),
        );
    },
});
