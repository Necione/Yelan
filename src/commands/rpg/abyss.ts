import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    updateUserStats,
} from "../../services";
import { locked } from "../../utils";
import { handleAbyssHunt } from "./handlers/abyssHandler";

export const abyss = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("abyss")
        .setDescription("[RPG] Continue down the abyss.")
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
            return r.edit(embedComment("Unable to fetch the original message."));
        }

        const userWallet = await getProfileByUserId(i.user.id);
        if (!userWallet) {
            locked.del(i.user.id);
            return r.edit(embedComment("Unable to find/create your user profile."));
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            locked.del(i.user.id);
            return r.edit(embedComment("No stats found for you, please set up your profile."));
        }

        if (stats.isTravelling) {
            locked.del(i.user.id);
            return r.edit(embedComment("You cannot go on a hunt while you are travelling!"));
        }

        if (stats.isHunting) {
            locked.del(i.user.id);
            return r.edit(embedComment("You are already hunting!"));
        }

        if (stats.hp <= 0) {
            locked.del(i.user.id);
            return r.edit(embedComment("You don't have enough HP to go on a hunt :("));
        }

        await updateUserStats(i.user.id, { isHunting: true });
        await handleAbyssHunt(i, message, stats, userWallet);

        locked.del(i.user.id);
    },
});