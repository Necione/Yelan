import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, make, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
    updateUserStats,
} from "../../services";
import { cooldowns, locked } from "../../utils";

export const devtools = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("devtools")
        .setDescription(
            "[RPG] Developer commands for RPG. Abuse will lead to a ban.",
        )
        .addStringOption((option) =>
            option
                .setName("option")
                .setDescription("Choose an option.")
                .setRequired(true)
                .addChoices(
                    { name: "unstuck", value: "unstuck" },
                    { name: "export_data", value: "export_data" },
                    { name: "exp_calc", value: "exp_calc" },
                    { name: "explode", value: "explode" },
                ),
        )
        .setDMPermission(false),
    only: { text: true, threads: false, voice: false, dms: false },
    defer: { silent: false },
    async execute(i, r) {
        const selectedOption = i.options.getString("option", true);

        if (selectedOption === "unstuck") {
            const userStats = await getUserStats(i.user.id);

            if (!userStats) {
                return r
                    .edit(
                        embedComment(
                            "No stats found for you. Please set up your profile.",
                        ),
                    )
                    .catch(noop);
            }

            if (!userStats.isHunting) {
                return r
                    .edit(embedComment("You are not currently hunting."))
                    .catch(noop);
            }

            const userWallet = await getProfileByUserId(i.user.id);
            if (!userWallet) {
                locked.del(i.user.id);
                return r.edit(
                    embedComment("Unable to find/create your user profile."),
                );
            }

            const cc = cooldowns.get(userWallet, "stuckHelper");
            if (!cc.status) {
                locked.del(i.user.id);
                return r.edit(embedComment(cc.message));
            }

            await updateUserStats(i.user.id, {
                isHunting: { set: false },
            });

            return r
                .edit(
                    embedComment(
                        "Your hunting status has been successfully reset.",
                    ),
                )
                .catch(noop);
        } else if (selectedOption === "export_data") {
            const userStats = await getUserStats(i.user.id);

            if (!userStats) {
                return r
                    .edit(
                        embedComment(
                            "No stats found for you. Please set up your profile.",
                        ),
                    )
                    .catch(noop);
            }

            await r
                .edit({
                    content:
                        "> Here is your exported data. Please save this as backup incase we need to reroll.",
                    files: [
                        {
                            name: `user_stats.json`,
                            attachment: Buffer.from(
                                JSON.stringify(userStats, null, 2),
                            ),
                        },
                    ],
                })
                .catch(noop);
        } else if (selectedOption === "explode") {
            const userStats = await getUserStats(i.user.id);

            if (!userStats) {
                return r
                    .edit(
                        embedComment(
                            "No stats found for you. Please set up your profile.",
                        ),
                    )
                    .catch(noop);
            }
            await updateUserStats(i.user.id, {
                hp: { set: 0 },
            });

            return r
                .edit(embedComment("Your HP has been set to 0."))
                .catch(noop);
        } else if (selectedOption === "exp_calc") {
            const expRequirements = make.array<string>();
            for (let rank = 1; rank <= 35; rank++) {
                const expRequired = 20 * Math.pow(1.2, rank - 1);
                expRequirements.push(
                    `**Rank ${rank}**: \`${Math.round(expRequired)} EXP\``,
                );
            }

            const expList = expRequirements.join("\n");

            const expEmbed = new EmbedBuilder()
                .setTitle("Experience Requirements for Adventure Ranks")
                .setDescription(expList)
                .setColor("Gold")
                .setFooter({
                    text: "Calculated using EXP = 20 * 1.2^(Rank - 1)",
                });

            return r
                .edit({
                    embeds: [expEmbed],
                })
                .catch(noop);
        } else {
            return r
                .edit(
                    embedComment(
                        "Invalid option selected. Please choose a valid option.",
                    ),
                )
                .catch(noop);
        }
    },
});
