import {
    buildCommand,
    buildSubCommand,
    getFilesList,
    handleSubCommands,
    type SlashCommand,
    type SubCommand,
} from "@elara-services/botbuilder";
import { SlashCommandBuilder } from "discord.js";
import * as commands from "./commands";

export const acc = buildCommand<SlashCommand>({
    command: buildSubCommand(
        new SlashCommandBuilder()
            .setName(`acc`)
            .setDescription(`[STAFF]: Manage the user profiles`)
            .setDMPermission(false),
        commands,
    ),
    defer: { silent: true },
    execute(interaction) {
        return handleSubCommands(
            interaction,
            getFilesList<SubCommand>(commands),
        );
    },
});
