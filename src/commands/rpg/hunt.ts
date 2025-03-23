import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, syncStats } from "../../services";
import { locked } from "../../utils";
import { startHunt } from "./handlers/huntHandler";

export const hunt = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("hunt")
        .setDescription("[RPG] Go on a hunt to fight monsters.")
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);
        const message = await r.edit(
            embedComment(`\`⚔️\` You continue your adventure...`, "Orange"),
        );
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

        const stats = await syncStats(i.user.id);

        if (!stats) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        await startHunt(message, i.user);
        locked.del(i.user.id);
    },
});
