import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getOriginalInventory } from "../../plugins/other/inventory";
import { getProfileByUserId } from "../../services";
import { userLockedData } from "../../utils";

export const inventory = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`inventory`)
        .setDescription(`View your profile inventory`)
        .setDMPermission(false)
        .addStringOption((o) =>
            o
                .setName(`search`)
                .setDescription(`[CARDS]: What do you want to search for?`)
                .setRequired(false),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.channel || !i.inCachedGuild()) {
            return;
        }
        const p = await getProfileByUserId(i.user.id);
        if (!p) {
            return r.edit(
                embedComment(`Unable to find/create your user profile.`),
            );
        }
        if (p.locked) {
            return r.edit(userLockedData(i.user.id));
        }
        const search = i.options.getString("search", false) ?? null;

        return r.edit(getOriginalInventory(i.user, p, search));
    },
});
