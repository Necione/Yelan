import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { Duration } from "@elara-services/packages";
import { embedComment, error, is, ms, noop } from "@elara-services/utils";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const selfmute = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`selfmute`)
        .setDescription(`Self mute yourself for a certain amount of time`)
        .setDMPermission(false)
        .addStringOption((o) =>
            o
                .setName("duration")
                .setDescription(`How long? (example: 1h1m, 1m, 1d)`)
                .setRequired(false),
        ),
    defer: { silent: true },
    async execute(i, r) {
        if (!i.channel || !i.inCachedGuild()) {
            return;
        }
        if (i.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return r.edit(
                embedComment(
                    `Unable to selfmute you. (You have \`Manage Server\` permission)`,
                ),
            );
        }
        if (!i.member.moderatable) {
            return r.edit(
                embedComment(`Unable to selfmute you (Missing Permissions)`),
            );
        }
        const duration = i.options.getString("duration", false) || "10m";
        if (!Duration.validate(duration)) {
            return r.edit(
                embedComment(`The custom duration (${duration}) isn't valid.`),
            );
        }
        let time = Duration.parse(duration);
        if (!is.number(time)) {
            return r.edit(
                embedComment(`Unable to parse the duration provided.`),
            );
        }
        if (time > 2332800000) {
            time = 2332800000;
        }
        const format = ms.get(time, true);
        return i.member
            .timeout(time, `Selfmute for ${format}`)
            .then(async (member) => {
                if (!member.communicationDisabledUntil) {
                    return;
                }
                await i.client.dms
                    .send({
                        userId: i.user.id,
                        body: embedComment(
                            `You muted yourself for ${format} go touch some grass and utilise this time in some productive work.\n## YOU WILL NOT BE UNMUTED, GO TOUCH GRASS OR SPAM AQUA AND ASK, DON'T OPEN TICKETS!`,
                            "Aqua",
                        ),
                    })
                    .catch(noop);
                return r.edit(
                    embedComment(
                        `You've been selfmuted for ${format}`,
                        "Green",
                    ),
                );
            })
            .catch((err) => {
                error(`Unable to selfmute ${i.user.tag} (${i.user.id})`, err);
                return r.edit(embedComment(`Unable to selfmute you.`));
            });
    },
});
