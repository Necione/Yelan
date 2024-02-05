import "dotenv/config";

import {
    deployCommands,
    type MessageContextMenuCommand,
    type SlashCommand,
    type UserContextMenuCommand,
} from "@elara-services/botbuilder";
import { getFilesList, type XOR } from "@elara-services/utils";
import * as Commands from "../commands";
import * as context from "../plugins/context";

const contextCmds =
    getFilesList<XOR<UserContextMenuCommand, MessageContextMenuCommand>>(
        context,
    );
const commands = getFilesList<SlashCommand>(Commands);
deployCommands(process.env.TOKEN as string, commands, contextCmds);
