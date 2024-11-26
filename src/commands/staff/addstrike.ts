import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { devId, roles } from "../../config";
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
        const reason = i.options.getString("reason", true);
        const initiator = i.user;
        if (i.user.id !== devId && user.id === devId) {
            return r.edit(embedComment(`Respectfully, fuck off.`));
        }
        const data = await addStrike(user.id, i.user.id, reason);
        if (!data.status) {
            return r.edit(embedComment(data.message));
        }
        await user
            .send({
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
            })
            .catch(console.log);

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
