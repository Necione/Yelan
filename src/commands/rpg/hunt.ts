import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
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
        await startHunt(message, i.user);
    },
});
