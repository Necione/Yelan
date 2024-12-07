import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserCharacters, updateUserCharacter } from "../../services";

export const nickname = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("nickname")
        .setDescription("[RPG] Assign a nickname to your character.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("character")
                .setDescription("The character to nickname")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addStringOption((option) =>
            option
                .setName("nickname")
                .setDescription("The nickname to assign")
                .setRequired(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const characters = await getUserCharacters(i.user.id);
        if (!is.array(characters)) {
            return i
                .respond([{ name: "No characters found.", value: "n/a" }])
                .catch(noop);
        }

        const focused = i.options.getFocused(true);
        const input = focused.value.toLowerCase();
        const filtered = characters
            .filter(
                (c) =>
                    c.name.toLowerCase().includes(input) ||
                    (c.nickname && c.nickname.toLowerCase().includes(input)),
            )
            .slice(0, 25)
            .map((c) => ({
                name: c.nickname ? `${c.nickname} (${c.name})` : c.name,
                value: c.name,
            }));

        if (!is.array(filtered)) {
            return i
                .respond([{ name: "No characters found.", value: "n/a" }])
                .catch(noop);
        }

        return i.respond(filtered).catch(noop);
    },
    async execute(i, r) {
        const charName = i.options.getString("character", true);
        const newNickname = i.options.getString("nickname", true);

        const characters = await getUserCharacters(i.user.id);
        const character = characters.find(
            (c) => c.name.toLowerCase() === charName.toLowerCase(),
        );

        if (!character) {
            return r.edit(
                embedComment(`You don't have a character named "${charName}".`),
            );
        }

        await updateUserCharacter(character.id, {
            nickname: { set: newNickname },
        });

        return r.edit(
            embedComment(
                `Successfully set nickname of **${character.name}** to **${newNickname} (${character.name})**!`,
                "Green",
            ),
        );
    },
});
