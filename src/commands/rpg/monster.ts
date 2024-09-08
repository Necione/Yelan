import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { initializeMonsters, monsters, monstersLoaded } from "../../utils/hunt";

export const monster = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("monster")
        .setDescription("[RPG] Display information about a monster.")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("The name of the monster.")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .setDMPermission(false),
    defer: { silent: false },
    async autocomplete(i) {
        if (!monstersLoaded) {
            await initializeMonsters();
        }

        const searchTerm = i.options.getString("name", false) ?? "";
        const monsterNames = monsters.map((monster) => monster.name);
        const filteredNames = monsterNames.filter((name) =>
            name.toLowerCase().includes(searchTerm.toLowerCase()),
        );

        if (filteredNames.length === 0) {
            return i
                .respond([{ name: "No match found.", value: "n/a" }])
                .catch(noop);
        }

        return i
            .respond(
                filteredNames.slice(0, 25).map((name) => ({
                    name,
                    value: name,
                })),
            )
            .catch(noop);
    },
    async execute(i, r) {
        if (!monstersLoaded) {
            await initializeMonsters();
        }

        const monsterName = i.options.getString("name", true);
        const monster = monsters.find(
            (m) => m.name.toLowerCase() === monsterName.toLowerCase(),
        );

        if (!monster) {
            return r.edit(
                embedComment(
                    `The monster "${monsterName}" was not found. Please check the name and try again.`,
                ),
            );
        }

        const dropsList = monster.drops
            .map(
                (drop) =>
                    `\`${drop.item}\`: \`${drop.minAmount}-${drop.maxAmount}\` (Chance: \`${drop.chance}%\`)`,
            )
            .join("\n");

        const embed = new EmbedBuilder()
            .setColor("Orange")
            .setTitle(`${monster.name}`)
            .setDescription(
                `**Min World Level**: ${
                    monster.minWorldLevel
                }\n**Locations**: ${monster.locations.join(", ")}`,
            )
            .addFields({
                name: "Drops",
                value: dropsList.length > 0 ? dropsList : "No drops available.",
                inline: false,
            })
            .setThumbnail(monster.image)
            .setFooter({
                text: `Requested by ${i.user.username}`,
                iconURL: i.user.displayAvatarURL(),
            });

        await r.edit({
            embeds: [embed],
        });
    },
});
