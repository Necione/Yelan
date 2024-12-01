import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, syncStats, updateUserStats } from "../../services";
import { cooldowns, locked } from "../../utils";
import { handleHunt } from "./handlers/huntHandler";

const sinSkills = ["Wrath", "Sloth", "Pride", "Greed"];

export const hunt = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("hunt")
        .setDescription("[RPG] Go on a hunt to fight monsters.")
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);

        const message = await i.fetchReply().catch(noop);
        if (!message) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to fetch the original message."),
            );
        }

        const p = await getProfileByUserId(i.user.id);
        if (!p) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to find/create your user profile."),
            );
        }

        const cc = cooldowns.get(p, "hunt");
        if (!cc.status) {
            locked.del(i.user.id);
            return r.edit(embedComment(cc.message));
        }

        const stats = await syncStats(i.user.id);
        if (!stats) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "No stats found for you, please set up your profile.",
                ),
            );
        }

        if (stats.isTravelling) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "You cannot go on a hunt while you are travelling!",
                ),
            );
        }

        if (stats.isHunting) {
            locked.del(i.user.id);
            return r.edit(embedComment("You are already hunting!"));
        }

        if (stats.abyssMode) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    "You cannot start a hunt while in The Spiral Abyss!",
                ),
            );
        }

        if (stats.hp <= 0) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("You don't have enough HP to go on a hunt :("),
            );
        }

        const activeSkills = stats.activeSkills || [];
        const activeSinSkills = activeSkills.filter((skill) =>
            sinSkills.includes(skill),
        );

        if (activeSinSkills.length > 1) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    `You cannot go on a hunt while having multiple Sin skills active. Currently active Sin skills: **${activeSinSkills.join(
                        ", ",
                    )}**. Please deactivate some Sin skills before hunting.`,
                ),
            );
        }

        await updateUserStats(i.user.id, { isHunting: { set: true } });
        await handleHunt(i, message, stats, p);

        locked.del(i.user.id);
    },
});
