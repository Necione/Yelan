import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";
import { cooldowns, locked } from "../../utils";
import { startHunt } from "./handlers/huntHandler";

export const hunt = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("hunt")
        .setDescription("[RPG] Go on a hunt to fight monsters.")
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        const message = await r.edit(
            embedComment(`\`⚔️\` You continue your adventure...`, "Orange"),
        );
        if (!message) {
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

        const stuckHelperTime = get.mins(5);
        await cooldowns.set(userWallet, "stuckHelper", stuckHelperTime);
        await startHunt(message, i.user);
    },
});
