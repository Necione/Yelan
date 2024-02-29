import { discord, is } from "@elara-services/utils";
import { Colors, EmbedBuilder, type Message, type User } from "discord.js";
import { getAllUserProfiles } from "../../services";

export async function handleUserToUID(message: Message) {
    if (
        ![
            "1201382235513835600", // Grader Commands
            "1169502932887154748", // testing
        ].includes(message.channelId)
    ) {
        return;
    }
    const ids = message.content
        .split(" ")
        .filter((c) => c.length >= 6 && !isNaN(parseInt(c)));
    if (!is.array(ids)) {
        return;
    }
    const users: User[] = [];
    for await (const id of ids) {
        const u = await discord.user(message.client, id, {
            fetch: true,
            mock: false,
        });
        if (u && !u.bot) {
            users.push(u);
        }
    }
    if (!is.array(users)) {
        return message.react(`❌`).catch(() => null);
    }
    const dbs = await getAllUserProfiles({
        where: {
            userId: {
                in: users.map((c) => c.id),
            },
        },
    });
    if (!is.array(dbs)) {
        return message.react(`❌`).catch(() => null);
    }
    const embed = new EmbedBuilder()
        .setTitle(`Genshin UID`)
        .setColor(Colors.Aqua);
    const desc: string[] = [];
    for (const user of users) {
        const f = dbs.find((c) => c.userId === user.id);
        if (!f || !f.rankedUID) {
            desc.push(`${user.toString()}:\n - UID: \`None\``);
        } else {
            desc.push(`${user.toString()}:\n - UID: \`${f.rankedUID}\``);
        }
    }
    if (!is.array(desc)) {
        return message.react(`❌`).catch(() => null);
    }
    embed.setDescription(desc.map((c) => `- ${c}`).join("\n"));
    return message.reply({ embeds: [embed] }).catch(() => null);
}
