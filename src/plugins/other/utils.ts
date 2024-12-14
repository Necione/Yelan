import { is, noop, status } from "@elara-services/utils";
import { Webhook, type sendOptions } from "@elara-services/webhooks";
import type { UserStats } from "@prisma/client";
import type { TextBasedChannel } from "discord.js";
import client from "../../client";
import type { SkillName } from "../../utils/skillsData";
import {
    specialSkills,
    type SpecialSkillName,
} from "../../utils/specialSkills";
let hook: Webhook;

export async function sendToChannel(
    channel: TextBasedChannel | string,
    options: sendOptions,
) {
    const id = is.string(channel)
        ? channel
        : "id" in channel && channel.id
          ? channel.id
          : null;
    if (!id) {
        return status.error(`No channelId found for "sendToChannel"`);
    }
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
        if (specialSkills.find((c) => c.skillName === name) || isSpecial) {
            if (active) {
                return (
                    stats.unlockedSpecialSkills.includes(name) &&
                    stats.activeSkills.includes(name)
                );
            }
            return stats.unlockedSpecialSkills.includes(name);
        }
        if (active) {
            return (
                stats.skills.some((c) => c.name === name) &&
                stats.activeSkills.includes(name as SkillName)
            );
        }
        return stats.skills.some((c) => c.name === name);
    },
};
