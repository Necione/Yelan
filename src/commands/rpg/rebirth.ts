import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { addButtonRow, embedComment, get, noop } from "@elara-services/utils";
import type { UserCharacter, UserStats } from "@prisma/client";
import {
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import {
    addBalance,
    getUserCharacters,
    getUserStats,
    updateUserCharacter,
    updateUserStats,
} from "../../services";
import { getAmount } from "../../utils";
import { artifacts, type ArtifactName } from "../../utils/rpgitems/artifacts";
import { drops, type DropName } from "../../utils/rpgitems/drops";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

export const rebirth = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("rebirth")
        .setDescription(
            "[RPG] Rebirth your character. All stats and items will be reset.",
        )
        .setDMPermission(false),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild() || !i.channel) {
            return;
        }

        const stats = await getUserStats(i.user.id);
        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }

        const rebirthRequirements = [5, 10, 15, 20, 25, 30, 35, 40];
        const requiredWorldLevel = rebirthRequirements[stats.rebirths] || 50;

        if (stats.worldLevel < requiredWorldLevel) {
            return r.edit(
                embedComment(
                    `You must be Adventure Rank ${requiredWorldLevel} or higher to rebirth.`,
                    "Red",
                ),
            );
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("Are you sure you want to Rebirth?")
            .setDescription(
                "All your stats will be reset, and you will go back to Adventure Rank 1. All items in your bag will be sold.\n\nYou will get +50 Max HP and a higher selling price.",
            )
            .setFooter({ text: "You have 10 seconds to confirm or cancel." });

        await r.edit({
            embeds: [confirmEmbed],
            components: [
                addButtonRow([
                    {
                        id: "confirm_rebirth",
                        label: "Confirm",
                        style: ButtonStyle.Success,
                    },
                    {
                        id: "cancel_rebirth",
                        label: "Cancel",
                        style: ButtonStyle.Danger,
                    },
                ]),
            ],
        });

        let totalSellPrice = 0;

        const rebirthMultiplier =
            1 +
            Math.min(stats.rebirths, 3) * 0.2 +
            Math.max(0, stats.rebirths - 3) * 0.1;

        for (const item of stats.inventory) {
            const itemData =
                drops[item.item as DropName] ||
                weapons[item.item as WeaponName] ||
                artifacts[item.item as ArtifactName];

            if (itemData) {
                const baseSellPrice = itemData.sellPrice * item.amount;
                const itemSellPrice = baseSellPrice * rebirthMultiplier;
                totalSellPrice += Math.round(itemSellPrice);
            }
        }

        const confirmation = await i.channel
            .awaitMessageComponent({
                time: get.secs(10),
                componentType: ComponentType.Button,
                filter: (interaction) => interaction.user.id === i.user.id,
            })
            .catch(noop);

        if (!confirmation) {
            return r.edit(embedComment("Rebirth request timed out."));
        }

        if (confirmation.customId === "confirm_rebirth") {
            await handleRebirth(i.user.id, stats, totalSellPrice);
            await confirmation.update(
                embedComment(
                    `Rebirth complete! All stats and items have been reset.\nAll items have been sold for ${getAmount(
                        totalSellPrice,
                    )}`,
                    "Green",
                ),
            );
        } else {
            await confirmation.update(embedComment("Rebirth canceled."));
        }
    },
});

async function handleRebirth(
    userId: string,
    stats: UserStats,
    totalSellPrice: number,
) {
    const defaultStats: Partial<UserStats> = {
        worldLevel: 1,
        exp: 0,
        attackPower: 5,
        maxHP: 100,
        hp: 100,
        critChance: 0,
        critValue: 1,
        defChance: 0,
        defValue: 0,
        highestWL: 1,
        healEffectiveness: 0,
        location: "Liyue Harbor",
        inventory: [],
        beatenBosses: [],
        equippedWeapon: null,
        equippedFlower: null,
        equippedPlume: null,
        equippedSands: null,
        equippedGoblet: null,
        equippedCirclet: null,
        rebirths: (stats.rebirths || 0) + 1,
    };

    const characters = (await getUserCharacters(userId)) as UserCharacter[];

    const defaultCharacterStats: Partial<UserCharacter> = {
        level: 1,
        attackPower: 5,
        maxHP: 100,
        hp: 100,
        critChance: 0,
        critValue: 1,
        defChance: 0,
        defValue: 0,
        equippedWeapon: null,
        equippedFlower: null,
        equippedPlume: null,
        equippedSands: null,
        equippedGoblet: null,
        equippedCirclet: null,
    };

    const characterUpdates = characters.map((character) => {
        return updateUserCharacter(character.id, {
            ...defaultCharacterStats,
        });
    });

    await Promise.all([
        updateUserStats(userId, {
            ...defaultStats,
        }),
        addBalance(userId, totalSellPrice, true, "Rebirth - sold all items"),
        ...characterUpdates,
    ]);
}
