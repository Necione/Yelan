import { type PrefixCommand } from "@elara-services/botbuilder";
import { fetch } from "@elara-services/packages";
import { discord, embedComment, get, is } from "@elara-services/utils";
import type { Pet } from "@prisma/client";
import { Message } from "discord.js";
import { getPets, updatePets } from "../../services";

export const petr: PrefixCommand = {
    enabled: true,
    name: "petr",
    locked: {
        users: [
            // Only main admins and devs have access to restore pets.
            "288450828837322764", // SUPERCHIEFYT
            "525171507324911637", // Neci
            "664601516220350494", // Hythen
        ],
    },
    async execute(_, r) {
        if (!r.args[0]) {
            return r.reply(embedComment(`You didn't provide any user ID`));
        }
        if (!r.args[1]) {
            return r.reply(
                embedComment(
                    `You didn't provide any message url to restore from.`,
                ),
            );
        }
        const user = await discord.user(_.client, r.args[0], {
            fetch: true,
            mock: false,
        });
        if (!user || user.bot) {
            return r.reply(
                embedComment(`Unable to find the user or it's a bot account.`),
            );
        }
        const messageURL = r.args[1];
        if (!messageURL.match(/\/channels\//gi)) {
            return r.reply(
                embedComment(`You didn't provide a valid message link`),
            );
        }
        const s = messageURL.split(/\/channels\//gi)[1];
        if (!is.string(s)) {
            return r.reply(embedComment(`Unable to parse the link`));
        }
        const [guildId, channelId, messageId] = s.split("/");
        const guild = _.client.guilds.resolve(guildId);
        if (!guild || !guild.available) {
            return r.reply(
                embedComment(
                    `Unable to find the server that message belongs to.`,
                ),
            );
        }
        const channel = guild.channels.resolve(channelId);
        if (!channel || !("messages" in channel)) {
            return r.reply(
                embedComment(
                    `Unable to find the channel that message belongs to.`,
                ),
            );
        }
        const message = await channel.messages.fetch(messageId).catch((e) => e);
        if (!(message instanceof Message)) {
            return r.reply(
                embedComment(`Unable to fetch the message info: ${message}`),
            );
        }

        const attachment = message.attachments.find((c) =>
            c.name.endsWith(".json"),
        );
        if (!attachment) {
            return r.reply(
                embedComment(`Unable to find the file in the channel.`),
            );
        }
        const data = await fetch<object, Pet>(attachment.url);
        if (!data) {
            return r.reply(embedComment(`Unable to fetch the file's data.`));
        }
        const db = await getPets(user.id);
        if (!db) {
            return r.reply(
                embedComment(`Unable to find/create their pets data.`),
            );
        }
        const pet = data;
        pet.cooldowns = [
            { type: "claim", ends: Date.now() + get.days(1) },
            { type: "feed", ends: Date.now() + get.hrs(3) },
            { type: "alive", ends: Date.now() + get.days(3) },
        ];
        db.pets.push(pet);
        await updatePets(user.id, { pets: { set: db.pets } });
        return r.reply(
            embedComment(`I've restored the pet info with ${message.url}`),
        );
    },
};
