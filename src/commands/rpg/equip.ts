import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import { getUserStats, updateUserStats } from "../../services";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const equip = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("equip")
        .setDescription("[RPG] Equip a weapon from your inventory.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("weapon")
                .setDescription("The weapon to equip")
                .setRequired(true)
                .addChoices(
                    ...getKeys(weapons).map((c) => ({
                        name: c,
                        value: c,
                    })),
                ),
        ),
    defer: { silent: false },
    async execute(i, r) {
        const weaponName = i.options.getString("weapon", true) as WeaponName;

        if (!weapons[weaponName]) {
            return r.edit(
                embedComment(`The weapon "${weaponName}" doesn't exist.`),
            );
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        const weapon = stats.inventory.find((c) => c.item === weaponName);
        if (!weapon) {
            return r.edit(
                embedComment(
                    `You don't have "${weaponName}" in your inventory to equip.\n-# Check your inventory with </rpg:1279824112566665297>`,
                ),
            );
        }

        const additionalAttackPower = weapons[weaponName].attackPower;
        const totalAttackPower = stats.baseAttack + additionalAttackPower;

        await updateUserStats(i.user.id, {
            equippedWeapon: weaponName,
            attackPower: totalAttackPower,
        });

        return r.edit(
            embedComment(
                `You have equipped **${weaponName}**! Your attack power is now ${totalAttackPower} (+${additionalAttackPower} from ${weaponName}).`,
                "Green",
            ),
        );
    },
});
