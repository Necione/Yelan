import { buildCommand } from "@elara-services/botbuilder";
import {
    embedComment,
    formatNumber,
    get,
    getConfirmPrompt,
    is,
    noop,
} from "@elara-services/utils";
import { Colors } from "discord.js";
import { mainServerId, roles } from "../../../../config";
import { prisma } from "../../../../prisma";
import { getAllUserProfiles } from "../../../../services";
import { logs } from "../../../../utils";

export const left = buildCommand({
    subCommand: (b) =>
        b.setName(`left`).setDescription(`Resets the left users profiles`),
    locked: { roles: roles.main },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }
        const guild = i.client.guilds.resolve(mainServerId); // This is the main server ID, DO NOT CHANGE IT, ANY USERS NOT FOUND IN THIS SERVER WILL REMOVE THEIR PROFILES.
        if (!guild || !guild.available) {
            return r.edit(
                embedComment(
                    `Unable to find the main server or it's not available.`,
                ),
            );
        }
        const members = await guild.members.fetch().catch(() => null);
        if (!members || !members.size) {
            return r.edit(
                embedComment(
                    `Unable to fetch the members list for: ${guild.name} (${guild.id}) so I can't check the user profiles list.`,
                ),
            );
        }
        const profiles = await getAllUserProfiles({
            where: {
                userId: {
                    notIn: [...members.keys()],
                },
            },
        });
        if (!is.array(profiles)) {
            return r.edit(embedComment(`No one needed to be removed.`));
        }
        const co = await getConfirmPrompt(
            i,
            i.user,
            `Are you 100% sure you want to reset (${formatNumber(
                profiles.length,
            )}) user profiles?`,
            get.secs(10),
        );
        if (!co) {
            return;
        }
        await co.deferUpdate().catch(() => null);
        await r.edit(
            embedComment(
                `Purging the left users profiles, one moment...`,
                "Orange",
            ),
        );
        const list = profiles
            .map(
                (c) =>
                    `- \`${
                        i.client.users.resolve(c.userId)?.username ||
                        "[UNKNOWN]"
                    }\` (${c.userId})`,
            )
            .join("\n");
        const backup = await logs.backup({
            content: `\`@${i.user.displayName}\` (${i.user.id}) purged the left users.`,
            embeds: [
                {
                    title: `Users:`,
                    color: Colors.Red,
                    description:
                        list.length > 4096
                            ? "Too many to list, look in the JSON file above.."
                            : list,
                },
            ],
            files: [
                {
                    name: "left_users_purge.json",
                    attachment: Buffer.from(
                        JSON.stringify(
                            {
                                count: profiles.length,
                                users: profiles.map(
                                    (c) =>
                                        `${
                                            i.client.users.resolve(c.userId)
                                                ?.displayName || "[UNKNOWN]"
                                        } (${c.userId})`,
                                ),
                                profiles,
                            },
                            undefined,
                            2,
                        ),
                    ),
                },
            ],
        });
        if (!backup) {
            return r.edit(
                embedComment(`Unable to purge the left users profiles`),
            );
        }
        await prisma.userWallet
            .deleteMany({
                where: {
                    userId: {
                        in: profiles.map((c) => c.userId),
                    },
                },
            })
            .catch(noop);

        return r.edit(
            embedComment(
                `✅ Purged (${formatNumber(
                    profiles.length,
                )}) user profiles.\n> Backed up to the \`#Backups\` thread.`,
                "Green",
            ),
        );
    },
});
