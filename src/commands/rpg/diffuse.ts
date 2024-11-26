import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, getKeys, is, noop } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";
import {
    getProfileByUserId,
    getUserStats,
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

function getRandomBait(options: { name: string; weight: number }[]): string {
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
        const itemName = i.options.getString("item", true);
        const amountToDiffuse = i.options.getInteger("amount", true);

        if (itemName === "n/a") {
            return r.edit(embedComment(`You didn't select a valid item.`));
        }

        const userWallet = await getProfileByUserId(i.user.id);
        if (!userWallet) {
            locked.del(i.user.id);
            return r.edit(
                embedComment("Unable to find/create your user profile."),
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

        const item = stats.inventory.find((c) => c.item === itemName);
        if (!item) {
            return r.edit(
                embedComment(
                    `You don't have "${itemName}" to diffuse.\n-# Check your inventory with </bag:1282456807100387411>`,
                ),
            );
        }
        if (item.amount < amountToDiffuse) {
            return r.edit(
                embedComment(
                    `You don't have enough of "${itemName}" to diffuse.\n-# Check your inventory with </bag:1282456807100387411>`,
                ),
            );
        }

        if (itemName === "Life Essence") {
            const item = stats.inventory.find((c) => c.item === itemName);
            if (!item || item.amount < amountToDiffuse) {
                return r.edit(
                    embedComment(
                        `You don't have enough "Life Essence" to diffuse.`,
                    ),
                );
            }

            const alchemyIncrease = amountToDiffuse;
            const newAlchemyProgress = stats.alchemyProgress + alchemyIncrease;

            item.amount -= amountToDiffuse;
            if (item.amount <= 0) {
                stats.inventory = stats.inventory.filter(
                    (c) => c.item !== item.item,
                );
            }

            await updateUserStats(i.user.id, {
                inventory: { set: stats.inventory },
                alchemyProgress: newAlchemyProgress,
            });

            return r.edit(
                embedComment(
                    `You diffused \`${amountToDiffuse}x\` **Life Essence** and gained \`${alchemyIncrease}\` Alchemy Point!`,
                    "Green",
                ),
            );
        }

        if (itemName in misc) {
            const baitAmount = amountToDiffuse;

            const selectedBait = getRandomBait(baitOptions);

            const existingBait = stats.inventory.find(
                (c) => c.item === selectedBait,
            );

            if (existingBait) {
                existingBait.amount += baitAmount;
            } else {
                stats.inventory.push({
                    item: selectedBait,
                    amount: baitAmount,
                    metadata: null,
                });
            }

            item.amount -= amountToDiffuse;
            if (item.amount <= 0) {
                stats.inventory = stats.inventory.filter(
                    (c) => c.item !== item.item,
                );
            }

            await updateUserStats(i.user.id, {
                inventory: { set: stats.inventory },
            });

            return r.edit(
                embedComment(
                    `You diffused \`${amountToDiffuse}x\` **${itemName}** and received \`${baitAmount}x\` **${selectedBait}**!`,
                    "Green",
                ),
            );
        }

        const totalDiffusePrice = itemData.sellPrice * amountToDiffuse;
        const totalHeal = Math.round(totalDiffusePrice * 1.5);
        const maxHP = stats.maxHP;
        const newHp = Math.min(stats.hp + totalHeal, maxHP);

        item.amount -= amountToDiffuse;
        if (item.amount <= 0) {
            stats.inventory = stats.inventory.filter(
                (c) => c.item !== item.item,
            );
        }

        await Promise.all([
            updateUserStats(i.user.id, {
                inventory: {
                    set: stats.inventory,
                },
                hp: newHp,
            }),
        ]);

        return r.edit(
            embedComment(
                `You diffused \`${amountToDiffuse}x\` **${itemName}** for 💗 \`${totalHeal} HP\`!`,
                "Green",
            ),
        );
    },
});
