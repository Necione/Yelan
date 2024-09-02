import {
    buildCommand,
    getUser,
    type SlashCommand,
} from "@elara-services/botbuilder";
import { randomNumber } from "@elara-services/packages";
import {
    addButtonRow,
    awaitComponent,
    discord,
    embedComment,
    get,
    make,
    sleep,
} from "@elara-services/utils";
import {
    ButtonStyle,
    Colors,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { isMainBot } from "../../config";
import {
    getProfileByUserId,
    removeBalance,
    updateUserProfile,
} from "../../services";
import { getAmount, locked, userLockedData } from "../../utils";
import { cooldowns } from "../../utils/";

const roleId = isMainBot ? "1279083821597462730" : "1280214758187995167";
const gifList = [
    "https://i.pinimg.com/originals/96/aa/c5/96aac5d44c80a822c7aa4e2b2bb11256.gif",
    "https://media.tenor.com/it4iGRb05DAAAAAM/mcdonalds-guns.gif",
    "https://media.tenor.com/fT3iPXvDCv0AAAAM/gun-fail-guns.gif",
];

export const shoot = buildCommand<SlashCommand>({
    // Use the 'buildCommand<SlashCommand>()' function to create commands.
    command: new SlashCommandBuilder()
        .setName(`shoot`)
        .setDescription(`Shoots a targetted user with a gun.`)
        .setDMPermission(false)
        .addUserOption((o) =>
            getUser(o, {
                name: "target",
                description: `Choose your target.`,
                required: true,
            }),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.member || !i.channel) {
            return;
        }
        const message = await i.fetchReply().catch(() => null); // For components, do this so it only attaches to the message the bot created.
        if (!message) {
            return;
        }
        locked.set(i); // When doing this make sure to add `locked.del(i.user.id);` for all of the places it returns a response otherwise the user will continue to stay locked out of all commands.
        const user = i.options.getUser("target", true); // You had 'user' here instead of 'target' which is what you named the command option.
        if (user.bot) {
            locked.del(i.user.id);
            return r.edit(embedComment(`I won't let you hurt one of my own!`)); // For responses like this use `embedComment` function, keeps things nice and claen.
        }
        if (i.user.id === user.id) {
            locked.del(i.user.id);
            return r.edit(embedComment(`Don't take the easy way out..`));
        }
        const list = [i.user.id, user.id];
        locked.set(user);
        const p1 = await getProfileByUserId(i.user.id);
        const p2 = await getProfileByUserId(user.id);
        if (p1.locked) {
            locked.del(list);
            return r.edit(userLockedData(i.user.id));
        }
        if (p1.staffCredits < 2) {
            locked.del(list);
            return r.edit(
                embedComment(`You need 2 or more reputation to shoot someone!`),
            );
        }
        if (p2.locked) {
            locked.del(list);
            return r.edit(userLockedData(user.id));
        }
        const cooldownResult = cooldowns.get(p1, "shoot");
        if (!cooldownResult.status) {
            locked.del(list);
            return r.edit(embedComment(cooldownResult.message));
        }
        const cd2 = cooldowns.get(p2, "shoot"); // Check for both users.
        if (!cd2.status) {
            locked.del(list);
            return r.edit(embedComment(cd2.message));
        }

        if (!i.member.roles.cache.has(roleId)) {
            const embed = new EmbedBuilder()
                .setTitle("The Fontaine Mafia")
                .setDescription(
                    `Only members of the <@&${roleId}> can use this command.\nPress the button below to join. \n\n-# ⚠️**WARNNING** You cannot leave the mafia once you enter.`,
                )
                .setThumbnail(`https://lh.elara.workers.dev/mafia.png`)
                .setColor(`#4343ff`);

            await r.edit({
                embeds: [embed],
                components: [
                    addButtonRow({
                        id: `join:mafia`,
                        label: `Join Le Milieu`,
                        style: ButtonStyle.Primary,
                    }),
                ],
            });
            const c = await awaitComponent(message, {
                custom_ids: [
                    {
                        id: `join:mafia`,
                        includes: true,
                    },
                ],
                users: [
                    {
                        allow: true,
                        id: i.user.id,
                    },
                ],
                time: get.mins(1),
            });
            if (!c) {
                locked.del(list);
                return r.edit(
                    embedComment(
                        `You didn't join \`Le Milieu\`, so you can't use this command.`,
                    ),
                );
            }
            await i.member.roles
                .add(roleId, `Joined Le Milieu`)
                .catch(() => null);
            await r.edit(embedComment(`Loading... one moment..`));
        }
        const tm = await discord.member(i.guild, user.id, true, true);
        if (!tm) {
            locked.del(list);
            return r.edit(
                embedComment(
                    `Unable to find ${user.toString()} in this server.`,
                ),
            );
        }
        if (!tm.roles.cache.has(roleId)) {
            locked.del(list);
            return r.edit(
                embedComment(
                    `${user.toString()} isn't in the <@&${roleId}> role!`,
                ),
            );
        }
        const amount = randomNumber({
            integer: true,
            min: 50,
            max: 150,
        });
        const embed = new EmbedBuilder()
            .setAuthor(author())
            .setColor(Colors.Aqua)
            .setTitle(`💥 BAAAAAAAANG!`)
            .setDescription(
                `${i.user.toString()} absolutely obliterated ${user.toString()}.\n-# ${i.user.toString()} lost 2 Reputation, and ${user.toString()} had to pay ${getAmount(
                    amount,
                )} for medical expenses!`,
            ) // User mentions don't work in the footer.
            .setImage(gifList[Math.floor(Math.random() * gifList.length)]);

        await r.edit({ embeds: [embed], components: [] });
        await cooldowns.set(p1, "shoot", get.hrs(3));
        await sleep(get.secs(2));
        await Promise.all([
            removeBalance(user.id, amount, false),
            updateUserProfile(i.user.id, { staffCredits: { decrement: 2 } }),
        ]);
        locked.del(list);
    },
});

function author(name?: string) {
    // Don't export this, by default "export * from "./shoot";" will export all functions/consts/lets in the index.ts file which causes issues with the commands handler.
    return {
        name: `Shoot${name || ""}`,
        iconURL: make.emojiURL("1090830675210420274", "gif"),
    };
}
