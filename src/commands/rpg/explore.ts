import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, getUserStats } from "../../services";
import { cooldowns, locked } from "../../utils";
import { handleChest } from "./handlers/exploreHandler";

export const explore = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("explore")
        .setDescription(
            "[RPG] Go on an exploration to find traders or treasure.",
        )
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);

        if (!i.deferred) {
            return;
        }

        const message = await i.fetchReply().catch(noop);
        if (!message) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to fetch the original message."),
            );
        }

        const userWallet = await getProfileByUserId(i.user.id);
        if (!userWallet) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to find/create your user profile."),
            );
        }

        const cc = cooldowns.get(userWallet, "explore");
        if (!cc.status) {
            locked.del(i.user.id);
            return r.edit(embedComment(cc.message));
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "No stats found for you, please set up your profile.",
                ),
            );
        }

        if (stats.isTravelling) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "You cannot go on an exploration while you are travelling!",
                ),
            );
        }

        if (stats.isHunting) {
            locked.del(i.user.id);
            return r.edit(embedComment("You cannot explore while hunting!"));
        }

        if (stats.hp <= 0) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("You don't have enough HP to explore :("),
            );
        }

        await handleChest(i, stats, userWallet);

        locked.del(i.user.id);
    },
});
