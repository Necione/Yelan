import { is } from "@elara-services/utils";
import { type GuildMember } from "discord.js";
import { roles as Roles, mainBotId } from "../../config";
import { getBotFromId } from "../../services/bot";
import { levels } from "../../services/levels";

export async function getColorRoles(member: GuildMember) {
    if (member.roles.cache.hasAny(...Roles.restrictedColors)) {
        return [];
    }
    const p = await levels.api.users.get(member.id, member.guild.id);
    if (!p.status) {
        return [];
    }
    const db = await getBotFromId(mainBotId);
    if (!db || !is.array(db?.colorRoles)) {
        return [];
    }
    const sort = db.colorRoles.sort((a, b) => a.level - b.level);
    const roles: string[] = [];
    for (const r of sort) {
        if (is.string(r.exclusive) && !member.roles.cache.has(r.exclusive)) {
            continue;
        }
        if (p.data.level >= r.level) {
            roles.push(...r.roles);
        }
    }
    return roles;
}

export async function getAllColorRoles() {
    const db = await getBotFromId(mainBotId);
    if (!db || !is.array(db?.colorRoles)) {
        return [];
    }
    return db.colorRoles.flatMap((c) => c.roles);
}
