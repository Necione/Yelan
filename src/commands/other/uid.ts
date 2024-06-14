import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getAllUserProfiles, getProfileByUserId } from "../../services";
import { logs } from "../../utils";

const regions = {
    asia: [1, 2, 5, 8],
    america: [6],
    europe: [7],
    other: [9],
};

function isValidRegion(uid: number) {
    const str = uid.toString();
    for (const region of Object.values(regions)) {
        if (region.some((c) => str.startsWith(c.toString()))) {
            return true;
        }
    }
    return false;
}

export const uid = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`uid`)
        .setDescription(`Set your Genshin UID`)
        .setDMPermission(false)
        .addStringOption((o) =>
            o
                .setName(`id`)
                .setDescription(`What's your Genshin UID?`)
                .setRequired(true)
                .setMinLength(5)
                .setMaxLength(9),
        ),
    defer: { silent: true },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const uid = parseInt(i.options.getString("id", true));
        if (!isValidRegion(uid)) {
            return r.edit(
                embedComment(`The Genshin UID you provided isn't valid.`),
            );
        }
        const db = await getProfileByUserId(i.user.id);
        if (!db) {
            return r.edit(
                embedComment(`Unable to find/create your user profile.`),
            );
        }
        if (db.locked) {
            return r.edit(
                embedComment(
                    `Your profile has been locked, you can't use this command.`,
                ),
            );
        }
        if (db.rankedUID) {
            return r.edit(
                embedComment(
                    `You already have a Genshin UID registered with your account.`,
                ),
            );
        }
        const isValid = await i.client.enka.enka.isValidUID(uid);
        if (!isValid) {
            return r.edit(
                embedComment(
                    `The UID you provided isn't registered with https://enka.network`,
                ),
            );
        }

        const others = (
            await getAllUserProfiles({
                where: {
                    rankedUID: uid,
                },
            })
        ).filter((c) => c.userId !== i.user.id);
        if (is.array(others)) {
            await logs.handle(
                {
                    content: `${i.user.toString()} (\`${
                        i.user.id
                    }\`) has tried using an already taken Genshin UID \`${uid}\`\n> Other user(s): ${others
                        .map((c) => `<@${c.userId}>`)
                        .join(", ")}`,
                    allowed_mentions: { parse: [] },
                    allowedMentions: { parse: [] },
                },
                "1079648430743363704",
            );
            return r.edit(
                embedComment(
                    `UID (${uid}) is already registered to another user.`,
                ),
            );
        }

        return await i.client.enka.sendVerificationMessage(i, uid);
    },
});
