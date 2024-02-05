import { buildCommand, type SubCommand } from "@elara-services/botbuilder";
import { displayData } from "../../../plugins/pets";

export const view = buildCommand<SubCommand>({
    subCommand: (b) => b.setName(`view`).setDescription(`View your pets`),
    defer: { silent: false },
    async execute(i, r) {
        return displayData(i, r);
    },
});
