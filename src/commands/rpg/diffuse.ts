import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys, is, noop } from "@elara-services/utils";
import { type UserCharacter, type UserStats } from "@prisma/client";
import { SlashCommandBuilder } from "discord.js";
import {
    addItemToInventory,
    checkEquipped,
    getProfileByUserId,
    getUserCharacters,
    getUserStats,
    removeItemFromInventory,
    updateUserStats,
} from "../../services";
import { locked } from "../../utils";
import { artifacts, type ArtifactName } from "../../utils/rpgitems/artifacts";
import { drops, type DropName } from "../../utils/rpgitems/drops";
import { misc, type MiscName } from "../../utils/rpgitems/misc";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";

const baitOptions = [
    { name: "Fruit Paste Bait", weight: 10 },
    { name: "Redrot Bait", weight: 1 },
    { name: "Sugardew Bait", weight: 1 },
];

function getRandomBait(options: { name: string; weight: number }[]) {
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    let random = Math.random() * totalWeight;
    for (const option of options) {
        if (random < option.weight) {
            return option.name;
        }
        random -= option.weight;
    }
    return options[options.length - 1].name;
}

const diffusionHandlers: {
    [itemName: string]: (
        userId: string,
        amount: number,
        stats: UserStats,
    ) => Promise<{ reply: string; color?: string }>;
} = {
    "Life Essence": async (userId, amount, stats) => {
        const alchemyIncrease = amount;
        const newAlchemyProgress = stats.alchemyProgress + alchemyIncrease;
        await removeItemFromInventory(userId, "Life Essence", amount);
        await updateUserStats(userId, {
            alchemyProgress: { set: newAlchemyProgress },
        });
        return {
            reply: `You diffused \`${amount}x\` **Life Essence** and gained \`${alchemyIncrease}\` Alchemy Point!`,
            color: "Green",
        };
    },
    "Scattered Star": async (userId, amount, stats) => {
        const newScatteredStarsUsed = (stats.scatteredStarsUsed || 0) + amount;
        const inventoryIncrease = amount * 200;
        await removeItemFromInventory(userId, "Scattered Star", amount);
        await updateUserStats(userId, {
            scatteredStarsUsed: { set: newScatteredStarsUsed },
        });
        return {
            reply: `You diffused \`${amount}x\` **Scattered Star** and increased your inventory capacity by \`${inventoryIncrease}\` slots!`,
            color: "Green",
        };
    },
    "Skill Token": async (userId, amount, stats) => {
        const newBonusTokens = (stats.bonusTokens || 0) + amount;
        await removeItemFromInventory(userId, "Skill Token", amount);
        await updateUserStats(userId, { bonusTokens: { set: newBonusTokens } });
        return {
            reply: `You diffused \`${amount}x\` **Skill Token** and gained \`${amount}\` Bonus Token${
                amount > 1 ? "s" : ""
            }!`,
            color: "Green",
        };
    },
};

export const diffuse = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("diffuse")
        .setDescription("[RPG] Trade an item in your bag for benefits")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("item")
                .setDescription("The item that you want to diffuse")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("The amount to diffuse")
                .setRequired(true)
                .setMinValue(1),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const list = [
            ...getKeys(drops),
            ...getKeys(weapons),
            ...getKeys(artifacts),
            ...getKeys(misc),
        ].map((c) => ({ name: String(c), value: c }));
        const item = i.options.getString("item", false) ?? "";
        if (!item) {
            return i.respond(list.slice(0, 25)).catch(noop);
        }
        const items = list.filter((c) =>
            c.name.toLowerCase().includes(item.toLowerCase()),
        );
        if (!is.array(items)) {
            return i
                .respond([{ name: "No match found for that.", value: "n/a" }])
                .catch(noop);
        }
        return i.respond(items.slice(0, 25)).catch(noop);
    },
    async execute(i, r) {
        const userId = i.user.id;
        const itemName = i.options.getString("item", true);
        const amountToDiffuse = i.options.getInteger("amount", true);

        if (itemName === "n/a") {
            return r.edit(embedComment(`You didn't select a valid item.`));
        }

        const userWallet = await getProfileByUserId(userId);
        if (!userWallet) {
            locked.del(userId);
            return r.edit(
                embedComment("Unable to find/create your user profile."),
            );
        }

        const stats = await getUserStats(userId);
        if (!stats) {
            return r.edit(
                embedComment(
                    `No stats found for you, please set up your profile.`,
                ),
            );
        }
        if (stats.isHunting) {
            return r.edit(embedComment("You cannot diffuse while hunting!"));
        }

        const itemData =
            drops[itemName as DropName] ||
            weapons[itemName as WeaponName] ||
            artifacts[itemName as ArtifactName] ||
            misc[itemName as MiscName];

        if (!itemData) {
            return r.edit(
                embedComment(
                    `The item "${itemName}" doesn't exist. Make sure you typed it correctly.`,
                ),
            );
        }

        const item = stats.inventory.find((entry) => entry.item === itemName);
        if (!item || item.amount < amountToDiffuse) {
            return r.edit(
                embedComment(
                    `You don't have enough "${itemName}" to diffuse (You have \`${
                        item?.amount || 0
                    }x\`).`,
                ),
            );
        }

        const characters = (await getUserCharacters(userId)) as UserCharacter[];
        if (checkEquipped(itemName, stats, characters)) {
            return r.edit(
                embedComment(
                    `You cannot diffuse "${itemName}" because it is currently equipped!`,
                ),
            );
        }

        if (diffusionHandlers[itemName]) {
            const { reply } = await diffusionHandlers[itemName](
                userId,
                amountToDiffuse,
                stats,
            );
            return r.edit(embedComment(reply));
        }

        if (itemName in misc) {
            const baitAmount = amountToDiffuse;
            const selectedBait = getRandomBait(baitOptions);
            await removeItemFromInventory(userId, itemName, amountToDiffuse);
            await addItemToInventory(userId, [
                { item: selectedBait, amount: baitAmount },
            ]);
            return r.edit(
                embedComment(
                    `You diffused \`${amountToDiffuse}x\` **${itemName}** and received \`${baitAmount}x\` **${selectedBait}**!`,
                    "Green",
                ),
            );
        }

        const totalDiffusePrice = itemData.sellPrice * amountToDiffuse;
        const totalHeal = Math.round(totalDiffusePrice * 1.5);
        const newHp = Math.min(stats.hp + totalHeal, stats.maxHP);
        await removeItemFromInventory(userId, itemName, amountToDiffuse);
        await updateUserStats(userId, { hp: { set: newHp } });
        return r.edit(
            embedComment(
                `You diffused \`${amountToDiffuse}x\` **${itemName}${
                    item.metadata?.length ? ` (${item.metadata.length} cm)` : ""
                }** for 💗 \`${totalHeal} HP\`!`,
                "Green",
            ),
        );
    },
});
