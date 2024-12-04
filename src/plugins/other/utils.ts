import { noop } from "@elara-services/utils";
import { type sendOptions, Webhook } from "@elara-services/webhooks";
import type { UserStats } from "@prisma/client";
import client from "../../client";
import type { SkillName } from "../../utils/skillsData";
import type { SpecialSkillName } from "../../utils/specialSkills";
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
    has: (
        stats: UserStats,
        name: SkillName | SpecialSkillName,
        active = true,
        isSpecial = false,
    ) => {
        if (isSpecial) {
            return stats.unlockedSpecialSkills.includes(
                name as SpecialSkillName,
            );
        } else {
            if (active) {
                return (
                    stats.skills.some((c) => c.name === name) &&
                    stats.activeSkills.includes(name as SkillName)
                );
            }
            return stats.skills.some((c) => c.name === name);
        }
    },
};
