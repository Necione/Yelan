import { noop } from "@elara-services/utils";
import { type sendOptions, Webhook } from "@elara-services/webhooks";
import type { UserStats } from "@prisma/client";
import client from "../../client";
let hook: Webhook;

export async function sendToChannel(id: string, options: sendOptions) {
    if (!hook) {
        hook = new Webhook(process.env.TOKEN as string);
    }
    if (!client.user || !hook) {
        return;
    }
    if (!options.webhook) {
        options.webhook = {
            name: client.user.username,
            icon: client.user.displayAvatarURL({
                forceStatic: true,
                extension: "png",
            }),
        };
    }
    return await hook.send(id, options, false, false).catch(noop);
}

export const skills = {
    has: (stats: UserStats, name: string, active = true) => {
        if (active) {
            return (
                stats.skills.some((c) => c.name === name) &&
                stats.activeSkills.includes(name)
            );
        }
        return stats.skills.some((c) => c.name === name);
    },
};
