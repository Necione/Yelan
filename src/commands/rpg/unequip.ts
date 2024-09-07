import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";

export const unequip = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("unequip")
        .setDescription("[RPG] Unequip your currently equipped weapon.")
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        if (!stats.equippedWeapon) {
            return r.edit(embedComment(`You don't have any weapon equipped.`));
        }

        const baseAttackPower = stats.baseAttack;

        await updateUserStats(i.user.id, {
            equippedWeapon: { set: null },
            attackPower: { set: baseAttackPower },
            critChance: { set: 0 },
            critValue: { set: 0 },
        });

        return r.edit(
            embedComment(`You have unequipped your weapon.`, "Green"),
        );
    },
});
