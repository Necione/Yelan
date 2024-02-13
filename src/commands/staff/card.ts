import {
    buildCommand,
    getInt,
    getStr,
    getUser,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { embedComment, is, log, proper } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { mainServerId, roles } from "../../config";
import { getProfileByUserId, updateUserProfile } from "../../services";
import { getCollectables } from "../../services/bot";

export const card = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`card`)
        .setDescription(`[ADMIN]: Give a card to a user`)
        .setDMPermission(false)
        .addUserOption((o) => getUser(o))
        .addStringOption((o) =>
            getStr(o, {
                name: "id",
                description: `What's the card ID?`,
                required: true,
            }),
        )
        .addIntegerOption((o) =>
            getInt(o, {
                name: "amount",
                description: `What's the amount you want to give them?`,
                required: false,
            }),
        )
        .addStringOption((o) =>
            getStr(o, {
                name: "type",
                description: `Which type?`,
                required: false,
                choices: ["add", "remove"].map((c) => ({
                    name: proper(c),
                    value: c,
                })),
            }),
        ),
    defer: { silent: true },
    locked: {
        roles: roles.main,
    },
    async execute(i) {
        if (!i.inCachedGuild()) {
            return;
        }
        const id = i.options.getString("id", true);
        const user = i.options.getUser("user", true);
        const amount = i.options.getInteger("amount", false) || 1;
        const type = i.options.getString("type", false) || "add";
        if (!is.number(amount)) {
            return i
                .editReply(embedComment(`You provided an invalid amount.`))
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }
        if (user.bot) {
            return i
                .editReply(embedComment(`Bots don't have a user profile.`))
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }
        const db = await getCollectables(mainServerId);
        if (!db || !is.array(db.items)) {
            return i
                .editReply(
                    embedComment(`There is no cards added to the server.`),
                )
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }
        const find = db.items.find((c) => c.id === id);
        if (!find) {
            return i
                .editReply(embedComment(`Unable to find card (${id})`))
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }
        const p = await getProfileByUserId(user.id);
        if (!p || p.locked) {
            return i
                .editReply(
                    embedComment(
                        `Unable to find/create the user's profile or it's locked.`,
                    ),
                )
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }
        let str = "";
        const f = p.collectables.find((c) => c.name === find.name);
        if (f) {
            if (type === "add") {
                f.count = Math.floor(f.count + amount);
                str += `Added +${amount} of \`${find.name}\` card to the user.`;
            } else {
                f.count = Math.floor(f.count - amount);
                if (f.count <= 0) {
                    p.collectables = p.collectables.filter(
                        (c) => c.name !== find.name,
                    );
                    str += `Removed \`${find.name}\` card from the user.`;
                } else {
                    str += `Removed -${amount} of \`${find.name}\` card from the user.`;
                }
            }
        } else {
            if (type === "add") {
                p.collectables.push({
                    name: find.name,
                    count: amount,
                });
                str += `Added +${amount} of \`${find.name}\` card to the user.`;
            } else {
                return i
                    .editReply(
                        embedComment(
                            `The card you selected the user doesn't have, so there isn't anything to remove.`,
                        ),
                    )
                    .catch((e) => log(`[${this.command.name}]: ERROR`, e));
            }
        }
        if (!str) {
            return i
                .editReply(embedComment(`Nothing needed to be updated?`))
                .catch((e) => log(`[${this.command.name}]: ERROR`, e));
        }
        await updateUserProfile(user.id, {
            collectables: {
                set: p.collectables,
            },
        });
        return i
            .editReply(embedComment(str, "Green"))
            .catch((e) => log(`[${this.command.name}]: ERROR`, e));
    },
});
