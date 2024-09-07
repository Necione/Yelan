import { colors, noop } from "@elara-services/utils";
import {
    EmbedBuilder,
    type ButtonInteraction,
    type GuildMember,
    type Interaction,
    type User,
} from "discord.js";

export async function handleInviteInteraction(i: ButtonInteraction) {
    if (!isInviteInt(i) || !i.inCachedGuild()) {
        return;
    }
    return i
        .reply({
            ephemeral: true,
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Invites FAQ`)
                    .setColor(colors.cyan)
                    .setAuthor(getAuthor(i.member, i.user))
                    .setDescription(
                        [
                            `You have to create the invite others will use, you CAN'T use the vanity link (\`.gg/liyue\`)`,
                            `**Only unique users is counted towards invite rewards**`,
                            `Only active invites is counted towards invite rewards, if you have an invite that expires it will not be counted.`,
                            `The users HAVE to stay in the server for the invite to be counted.`,
                            `There is a delay between your invite counts due to Discord's caching system. (**THIS CAN'T BE CHANGED BY US**)`,
                        ]
                            .map((c) => `- ${c}`)
                            .join("\n"),
                    ),
            ],
        })
        .catch(noop);
}

export function isInviteInt(i: Interaction) {
    return i.isButton() && i.inCachedGuild() && i.customId.startsWith("ifaq:");
}

export function getAuthor(member: GuildMember, user: User) {
    return {
        name:
            member.displayName === user.displayName
                ? user.displayName
                : `${member.displayName} (${user.username})`,
        iconURL: member.displayAvatarURL(),
    };
}
