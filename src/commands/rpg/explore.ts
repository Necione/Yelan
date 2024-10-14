import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, syncStats } from "../../services";
import { cooldowns, locked } from "../../utils";
import { handleChest, handleMaterials } from "./handlers/exploreHandler";

export const explore = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("explore")
        .setDescription(
            "[RPG] Go on an exploration to find traders or treasure.",
        )
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("Type of exploration")
                .setRequired(true)
                .addChoices(
                    { name: "Chest", value: "chest" },
                    { name: "Materials", value: "materials" },
                ),
        ),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        locked.set(i.user);

        if (!i.deferred) {
            return;
        }

        const message = await i.fetchReply().catch(noop);
        if (!message) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to fetch the original message."),
            );
        }

        const userWallet = await getProfileByUserId(i.user.id);
        if (!userWallet) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to find/create your user profile."),
            );
        }

        const cc = cooldowns.get(userWallet, "explore");
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
                    "You cannot go on an exploration while you are travelling!",
                ),
            );
        }

        if (stats.isHunting) {
            locked.del(i.user.id);
            return r.edit(embedComment("You cannot explore while hunting!"));
        }

        if (stats.hp <= 0) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("You don't have enough HP to explore :("),
            );
        }

        const exploreType = i.options.getString("type", true);

        const hasEnergizeSkill =
            stats.skills.some((skill) => skill.name === "Energize") &&
            stats.activeSkills.includes("Energize");

        const exploreCooldown = hasEnergizeSkill ? get.mins(15) : get.mins(20);
        await cooldowns.set(userWallet, "explore", exploreCooldown);

        if (exploreType === "chest") {
            await handleChest(i, stats, userWallet);
        } else if (exploreType === "materials") {
            await handleMaterials(i, stats, userWallet);
        } else {
            await i.editReply(embedComment("Invalid exploration type."));
        }

        locked.del(i.user.id);
    },
});
