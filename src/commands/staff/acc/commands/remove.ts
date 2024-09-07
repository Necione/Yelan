import { buildCommand, getUser } from "@elara-services/botbuilder";
import {
    embedComment,
    get,
    getConfirmPrompt,
    noop,
} from "@elara-services/utils";
import { prisma } from "../../../../prisma";
import { getProfileByUserId } from "../../../../services";
import { logs } from "../../../../utils";

export const remove = buildCommand({
    subCommand: (b) =>
        b
            .setName(`remove`)
            .setDescription(`Remove a user's profile.`)
            .addUserOption((o) => getUser(o)),
    locked: {
        users: [
            "288450828837322764", // SUPERCHIEFYT
            "525171507324911637", // Neci
            "664601516220350494", // Hythen
            "1113509442223345734", // Aqua
        ],
    },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const user = i.options.getUser("user", true);

        if (user.bot) {
            return r.edit(embedComment(`Bots don't have a profile.`));
        }
        const p = await getProfileByUserId(user.id);
        if (!p) {
            return r.edit(embedComment(`Unable to find their user profile.`));
        }
        const col = await getConfirmPrompt(
            i,
            i.user,
            `## ⚠️ Are you 100% sure you want to **\`COMPLETELY REMOVE\`** ${user.toString()}'s profile data?`,
            get.secs(10),
        );
        if (!col) {
            return;
        }

        const msg = await logs.backup({
            content: `> \`${i.user.displayName}\` (${i.user.id}) deleted \`${user.displayName}\` (${user.id}) profile`,
            files: [
                {
                    name: `${user.id}.json`,
                    attachment: Buffer.from(JSON.stringify(p, undefined, 2)),
                },
            ],
        });
        if (!msg) {
            return r.edit(
                embedComment(`Unable to delete ${user.toString()}'s profile.`),
            );
        }

        await prisma.userWallet
            .delete({ where: { userId: user.id } })
            .catch(noop);
        return r.edit(
            embedComment(
                `I've completely removed ${user.toString()}'s profile from the database.`,
                `Green`,
            ),
        );
    },
});
