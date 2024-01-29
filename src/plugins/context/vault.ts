import {
    buildCommand,
    type UserContextMenuCommand,
} from "@elara-services/botbuilder";
import { embedComment, formatNumber } from "@elara-services/utils";
import {
    ApplicationCommandType,
    Colors,
    ContextMenuCommandBuilder,
    EmbedBuilder,
} from "discord.js";
import { getProfileByUserId } from "../../services";
import { customEmoji, texts } from "../../utils";

export const vault = buildCommand<UserContextMenuCommand>({
    command: new ContextMenuCommandBuilder()
        .setName(`View Vault`)
        .setDMPermission(false)
        .setType(ApplicationCommandType.User),
    defer: { silent: true },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const db = await getProfileByUserId(i.targetId);
        if (!db) {
            return r.edit(
                embedComment(`Unable to find/create the user's profile.`),
            );
        }
        return r.edit({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({
                        name: `@${i.targetUser.username}`,
                        iconURL: i.targetUser.displayAvatarURL(),
                    })
                    .setFooter({ text: `ID: ${i.targetId}` })
                    .setColor(i.targetMember.displayColor || Colors.Aqua)
                    .addFields(
                        {
                            name: `Balance`,
                            value: `${customEmoji.a.z_coins} \`${formatNumber(
                                db.balance,
                            )} ${texts.c.u}\``,
                        },
                        {
                            name: `Vault`,
                            value: `${customEmoji.a.z_coins} \`${formatNumber(
                                db.vault,
                            )} ${texts.c.u}\``,
                        },
                    ),
            ],
        });
    },
});
