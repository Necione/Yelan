import {
    buildCommand,
    buildSubCommand,
    handleSubCommands,
    type SlashCommand,
    type SubCommand,
} from "@elara-services/botbuilder";
import { getFilesList } from "@elara-services/utils";
import * as subCommands from "./commands";

export const rr = buildCommand<SlashCommand>({
    command: buildSubCommand(
        (builder) =>
            builder
                .setName("rr")
                .setDescription("Join/view/Start the ")
                .setDMPermission(false),
        subCommands,
    ),
    async execute(i) {
        return handleSubCommands(
            i,
            getFilesList<SubCommand>(subCommands),
            undefined,
        );
    },
});
