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

export const booster = buildCommand<SlashCommand>({
    command: buildSubCommand(
        new SlashCommandBuilder()
            .setName(`booster`)
            .setDescription(`View the booster sub commands`)
            .setDMPermission(false),
        commands,
    ),
    defer: { silent: false },
    execute(i) {
        return handleSubCommands(
            i,
            getFilesList<SubCommand>(commands),
            undefined,
        );
    },
});
