import { buildPostCommand } from "@elara-services/botbuilder";
import { roles } from "../../config";

export const rickroll = buildPostCommand(`RickRoll?`, {
    users: ["288450828837322764"],
    roles: roles.main,
});
