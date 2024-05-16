import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId } from "../../services";

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

function generateOTP() {
    return Math.floor(10000 + Math.random() * 90000).toString();
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

        const otp = generateOTP();

        await r.edit(
            embedComment(`Thank you! Please set your Genshin Impact status to "${otp}" in order to verify your UID. Staff will check and get back to you within 24 hours.`, "Green"),
        );

        const channel = await i.client.channels.fetch('1240509113650380922');
        if (channel && channel.isTextBased()) {
            await channel.send({
                content: `User **${i.user.tag}** *(ID: ${i.user.id})* has requested to set their UID to \`${uid}\`. Please verify their status within 24 hours.\n> OTP \`${otp}\`.\n> https://enka.network/u/${uid}/`,
            });
        }
    },
});
