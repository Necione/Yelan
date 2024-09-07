import { embedComment, get, noop, sleep, time } from "@elara-services/utils";
import { type Message } from "discord.js";
import { channels } from "../../config";
import { getProfileByUserId } from "../../services";
const announced = new Set<string>();
const ignore = new Set<string>();

export async function onAchievemntSubmit(message: Message<true>) {
    if (
        message.channelId !== channels.achievementSubmit ||
        message.author.bot
    ) {
        return;
    }
    if (ignore.has(message.author.id) || announced.has(message.author.id)) {
        return;
    }
    const db = await getProfileByUserId(message.author.id);
    if (!db || db.locked) {
        ignore.add(message.author.id);
        return;
    }

    if (!db.rankedUID) {
        announced.add(message.author.id);
        await message.react("1110060610164621392").catch(noop);
        return message
            .reply(
                embedComment(
                    `Hello, before you can submit for achievements you need to register your UID!\n### How to set your UID\n- Go to <#1079322620295643217> and use the \`/uid\` command via ${message.client.user.toString()}\n- Provide your UID in the \`id\` option of the command.\n- That should be it, your UID should be set. If it's not open a General help ticket in <#1177437750782349333>!\n\n> This message will be deleted ${time.countdown(
                        get.secs(20),
                    )}`,
                ),
            )
            .then((m) => sleep(get.secs(20)).then(() => m.delete().catch(noop)))
            .catch(noop);
    }
}
