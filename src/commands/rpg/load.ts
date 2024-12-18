import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import {
    getUserStats,
    loadouts,
    syncStats,
    updateUserStats,
} from "../../services";
import {
    calculateStatChanges,
    getSetBonusMessages,
} from "../../utils/artifactHelper";

export const load = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("load")
        .setDescription("[RPG] Load a saved loadout to equip your items.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Name of the loadout to load")
                .setRequired(true)
                .setAutocomplete(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const focused = i.options.getFocused(true);
        const input = focused.value.toLowerCase();
        const lds = await loadouts.list(i.user.id, input);

        const options = await Promise.all(
            lds.map(async (loadout) => {
                let userName = "Unknown User";

                if (loadout.userId === i.user.id) {
                    userName = i.user.username;
                } else {
                    const user = await i.client.users.fetch(loadout.userId);
                    userName = user ? user.username : "Unknown User";
                }

                return {
                    name:
                        loadout.userId === i.user.id
                            ? `${loadout.name} - ${
                                  loadout.isPrivate ? "Private" : "Public"
                              } Loadout by you.`
                            : `${loadout.name} - Public Loadout by ${userName}`,
                    value: loadout.id,
                };
            }),
        );

        if (!is.array(options)) {
            return i
                .respond([{ name: "No loadouts found.", value: "n/a" }])
                .catch(noop);
        }

        return i.respond(options).catch(noop);
    },
    async execute(i, r) {
        const inputName = i.options.getString("name", true);
        const userId = i.user.id;

        if (!inputName) {
            return r.edit(embedComment("Loadout name cannot be empty."));
        }

        const loadout = await loadouts.getById(inputName);

        if (!loadout) {
            return r.edit(embedComment(`Loadout **${inputName}** not found.`));
        }

        if (loadout.isPrivate && loadout.userId !== userId) {
            return r.edit(
                embedComment("This is a private loadout, you cannot use it."),
            );
        }

        const stats = await getUserStats(userId);
        if (!stats) {
            return r.edit(
                embedComment("No stats found. Please set up your profile."),
            );
        }

        const itemsToEquip = [
            loadout.equippedWeapon,
            loadout.equippedFlower,
            loadout.equippedPlume,
            loadout.equippedSands,
            loadout.equippedGoblet,
            loadout.equippedCirclet,
        ].filter(Boolean) as string[];

        if (!is.array(itemsToEquip)) {
            return r.edit(
                embedComment("The selected loadout has no items to equip."),
            );
        }

        const hasAllItems = itemsToEquip.every((item) =>
            stats.inventory.some(
                (invItem) => invItem.item.toLowerCase() === item.toLowerCase(),
            ),
        );

        if (!hasAllItems) {
            return r.edit(
                embedComment(
                    "You do not possess all items required by this loadout.",
                ),
            );
        }

        await updateUserStats(userId, {
            equippedWeapon: loadout.equippedWeapon
                ? { set: loadout.equippedWeapon }
                : { set: null },
            equippedFlower: loadout.equippedFlower
                ? { set: loadout.equippedFlower }
                : { set: null },
            equippedPlume: loadout.equippedPlume
                ? { set: loadout.equippedPlume }
                : { set: null },
            equippedSands: loadout.equippedSands
                ? { set: loadout.equippedSands }
                : { set: null },
            equippedGoblet: loadout.equippedGoblet
                ? { set: loadout.equippedGoblet }
                : { set: null },
            equippedCirclet: loadout.equippedCirclet
                ? { set: loadout.equippedCirclet }
                : { set: null },
        });

        const updatedStats = await syncStats(userId);
        const statChanges = calculateStatChanges(stats, updatedStats);
        const setBonusMessages = getSetBonusMessages(
            stats,
            updatedStats,
            "activated",
        );

        return r.edit(
            embedComment(
                `Loadout **${loadout.name.replace(
                    `${userId}'s `,
                    "",
                )}** has been loaded successfully!\n${[
                    ...statChanges,
                    ...setBonusMessages,
                ].join("\n")}`,
                "Green",
            ),
        );
    },
});
