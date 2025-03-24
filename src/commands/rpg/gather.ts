import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, get, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, getUserStats } from "../../services";
import { cooldowns, debug, locked } from "../../utils";
import { getUserSkillLevelData } from "../../utils/skillsData";
import { handleMaterials } from "./handlers/exploreHandler";

export const gather = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("gather")
        .setDescription("[RPG] Gather raw materials from your surroundings.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        try {
            locked.set(i.user);
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

            const cc = cooldowns.get(userWallet, "gather");
            if (!cc.status) {
                locked.del(i.user.id);
                return r.edit(embedComment(cc.message));
            }

            const stats = await getUserStats(i.user.id);
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
                        "You cannot gather materials while you are travelling!",
                    ),
                );
            }

            if (stats.isHunting || stats.abyssMode) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment("You cannot gather materials right now!"),
                );
            }

            if (stats.hp <= 0) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment(
                        "You don't have enough HP to gather materials :(",
                    ),
                );
            }

            const energizeSkill = getUserSkillLevelData(stats, "Energize");
            const gatherCooldown = energizeSkill?.levelData?.cooldown
                ? get.mins(energizeSkill.levelData.cooldown)
                : get.mins(15);
            await cooldowns.set(userWallet, "gather", gatherCooldown);

            await r.edit(
                embedComment(`Gathering materials around ${stats.location}...`),
            );
            await new Promise((resolve) =>
                setTimeout(
                    resolve,
                    get.secs(Math.floor(Math.random() * 3) + 3),
                ),
            );

            await handleMaterials(i);

            locked.del(i.user.id);
        } catch (err) {
            debug(`[RPG:GATHER]: ERROR`, err);
            locked.del(i.user.id);
        }
    },
});
