import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, updateRankedUID } from "../../services";

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
        .addIntegerOption((o) =>
            o
                .setName(`id`)
                .setDescription(`What's your Genshin UID?`)
                .setRequired(true)
                .setMinValue(5)
                .setMaxValue(10),
        ),
    defer: { silent: true },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const uid = i.options.getInteger("id", true);
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
        await updateRankedUID(i.user.id, uid);
        return r.edit(
            embedComment(`Your Genshin UID is now set to \`${uid}\``, "Green"),
        );
    },
});
