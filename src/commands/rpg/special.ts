import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import {
    type ApplicationCommandOptionChoiceData,
    type AutocompleteFocusedOption,
    type AutocompleteInteraction,
    SlashCommandBuilder,
} from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { locked } from "../../utils";
import type { Monster } from "../../utils/helpers/huntHelper";
import { generateNextHuntMonsters } from "../../utils/helpers/huntHelper";

export const special = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("special")
        .setDescription("[RPG] Use a special skill ability.")
        .addStringOption((option) =>
            option
                .setName("skill")
                .setDescription("Which special skill to use?")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .setDMPermission(false),
    defer: { silent: false },

    async execute(interaction, r) {
        const skillName = interaction.options.getString("skill", true);
        const stats = await getUserStats(interaction.user.id);

        if (!stats) {
            return r.edit(
                embedComment(
                    "No stats found for you. Please set up your profile.",
                ),
            );
        }
        if (!stats.activeSkills.includes(skillName)) {
            return r.edit(
                embedComment(`You don't have the skill "${skillName}" active!`),
            );
        }

        if (skillName === "Peer") {
            locked.set(interaction.user, "hunt");

            if (stats.nextHunt && stats.nextHunt.length > 0) {
                const displayList: string[] = [];

                for (const rawName of stats.nextHunt) {
                    const [baseName, mutation] = rawName.split("|");
                    let displayName = baseName.trim();
                    if (mutation) {
                        displayName = `${mutation.trim()} ${displayName}`;
                    }
                    displayList.push(displayName);
                }

                locked.del(interaction.user.id);

                return r.edit(
                    embedComment(
                        `\`🔮\` The Peer skill reveals your **existing** next hunt:\n\n**${displayList.join(
                            ", ",
                        )}**`,
                    ),
                );
            }

            const monsters = await generateNextHuntMonsters(stats);

            const nextHuntEntries = monsters.map((m: Monster) => {
                const base = m.baseName ?? m.name;
                if (m.mutationType) {
                    return `${base}|${m.mutationType}`;
                }
                return base;
            });

            await updateUserStats(stats.userId, {
                nextHunt: { set: nextHuntEntries },
            });

            locked.del(interaction.user.id);

            const displayList: string[] = [];
            for (const m of monsters) {
                const base = m.baseName ?? m.name;
                if (m.mutationType) {
                    displayList.push(`${m.mutationType} ${base}`);
                } else {
                    displayList.push(base);
                }
            }

            return r.edit(
                embedComment(
                    `\`🔮\` The Peer skill reveals your **next hunt**:\n\n**${displayList.join(
                        ", ",
                    )}**`,
                ),
            );
        }

        return r.edit(
            embedComment(`No special ability found for "${skillName}".`),
        );
    },

    async autocomplete(interaction: AutocompleteInteraction) {
        const focused = interaction.options.getFocused(
            true,
        ) as AutocompleteFocusedOption;
        if (focused.name !== "skill") {
            return interaction.respond([]);
        }

        const stats = await getUserStats(interaction.user.id);
        if (!stats) {
            return interaction.respond([]);
        }

        const choices: ApplicationCommandOptionChoiceData<string>[] = [];

        if (stats.activeSkills.includes("Peer")) {
            choices.push({ name: "Peer", value: "Peer" });
        }

        const typed = focused.value.toLowerCase();
        const filtered = choices.filter((c) =>
            c.name.toLowerCase().includes(typed),
        );

        return interaction.respond(filtered.slice(0, 25));
    },
});
