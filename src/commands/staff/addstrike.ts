import {
    buildCommand,
    getStr,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { isDev, roles } from "../../config";
import { addStrike } from "../../services";
import { getAmount, logs } from "../../utils";

export const addstrike = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("addstrike")
        .setDescription("[STAFF] Add a strike to a user")
        .setDMPermission(false)
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user you want to strike")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("The reason for the strike")
                .setRequired(true),
        )
        .addStringOption((o) =>
            getStr(o, {
                name: "rule",
                description: "Which rule did they break?",
                required: true,
                choices: new Array(6).fill(0).map((_, i) => ({
                    name: `Rule ${i + 1}`,
                    value: `**[Rule:${i + 1}]: **`,
                })),
            }),
        ),
    defer: { silent: true },
    locked: {
        roles: [...roles.main, roles.moderator],
    },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }

        const user = i.options.getUser("user", true);
        let reason = i.options.getString("reason", true);
        const rule = i.options.getString("rule", true);
        reason = `${rule} ${reason}`;
        const initiator = i.user;
        if (!isDev(i.user.id) && isDev(user.id)) {
            return r.edit(embedComment(`Respectfully, fuck off.`));
        }
        const data = await addStrike(user.id, i.user.id, reason);
        if (!data.status) {
            return r.edit(embedComment(data.message));
        }
        await i.client.dms
            .send({
                userId: user.id,
                body: {
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xff5856)
                            .setTitle("`🔥` You have received a strike!")
                            .setDescription(
                                `You have been given a strike by a staff member for the following reason:\n\n*${reason}*\n\nAs a result, you have been fined ${getAmount(
                                    data.fine,
                                )}`,
                            )
                            .setFooter({
                                text: `⚠️ You will be banned permanently at 5 Strikes`,
                            }),
                    ],
                },
            })
            .catch(noop);

        await logs.strikes({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setTitle("Strike Issued")
                    .setDescription(
                        `**User:** ${user.tag} (${
                            user.id
                        })\n**Total Strikes:** ${
                            data.data.strike.length
                        }\n**Reason:** ${reason}\n**Fine:** ${getAmount(
                            data.fine,
                        )}`,
                    )
                    .setFooter({
                        text: `Issued by: ${initiator.username} (${initiator.id})`,
                        iconURL: initiator.displayAvatarURL(),
                    })
                    .setTimestamp(),
            ],
        });

        return r.edit(
            embedComment(
                `${user.toString()} has been given a strike and fined ${getAmount(
                    data.fine,
                )}`,
                "Green",
            ),
        );
    },
});
