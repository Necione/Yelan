import { addButtonRow, awaitComponent, get, noop } from "@elara-services/utils";
import { customEmoji } from "@liyueharbor/econ";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import { addItemToInventory, removeBalance } from "../../services";
import { artifacts } from "../rpgitems/artifacts";
import { createEvent } from "./utils";

type InventoryItem = {
    item: string;
    amount: number;
};

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export const traderEvent = createEvent({
    name: "traderEvent",
    required: {
        min: {
            rank: 15,
            rebirths: 4,
        },
    },
    async execute(message, stats, userWallet) {
        const coinCost: number = 200;

        const artifactNames: string[] = Object.keys(artifacts);
        if (artifactNames.length < 5) {
            const insufficientEmbed = new EmbedBuilder()
                .setTitle("Wandering Trader")
                .setDescription(
                    "The trader does not have enough items to offer.",
                )
                .setColor("Grey");

            return message
                .edit({
                    embeds: [insufficientEmbed],
                    components: [],
                })
                .catch(noop);
        }

        const shuffledArtifacts: string[] = shuffleArray([...artifactNames]);
        const uniqueSelectedArtifacts: string[] = shuffledArtifacts.slice(0, 5);

        const ids: Record<string, string> = uniqueSelectedArtifacts.reduce<
            Record<string, string>
        >((acc, artifactName: string) => {
            const safeName: string = artifactName
                .replace(/\s+/g, "_")
                .replace(/[^a-zA-Z0-9_]/g, "");
            acc[artifactName] = `event_buy_${safeName}`;
            return acc;
        }, {});

        const embed = new EmbedBuilder()
            .setTitle("A Wandering Trader Offers His Wares!")
            .setDescription(
                `A mysterious trader appears and offers you some rare artifacts for \`200\` ${customEmoji.a.z_coins}.\nChoose an artifact you wish to buy:`,
            )
            .setColor("Gold");

        const buttons = uniqueSelectedArtifacts.map((artifactName: string) => ({
            id: ids[artifactName],
            label: artifactName,
            style: ButtonStyle.Primary,
        }));

        buttons.push({
            id: "event_ignoreTrader",
            label: "Leave",
            style: ButtonStyle.Danger,
        });

        const buttonRows: any[] = [];
        for (let i = 0; i < buttons.length; i += 5) {
            buttonRows.push(addButtonRow(buttons.slice(i, i + 5)));
        }

        await message
            .edit({
                embeds: [embed],
                components: buttonRows,
            })
            .catch(noop);

        const interaction = await awaitComponent(message, {
            filter: (ii) => ii.customId.startsWith("event_"),
            users: [{ allow: true, id: stats.userId }],
            time: get.secs(15),
        });

        if (!interaction) {
            const timeoutEmbed = embed.setDescription(
                "The trader waits for a moment but then continues on his way.",
            );

            return message
                .edit({
                    embeds: [timeoutEmbed],
                    components: [],
                })
                .catch(noop);
        }

        if (interaction.customId === "event_ignoreTrader") {
            const leaveEmbed = embed.setDescription(
                "You decided not to engage with the trader and continue on your journey.",
            );

            return message
                .edit({
                    embeds: [leaveEmbed],
                    components: [],
                })
                .catch(noop);
        }

        const chosenArtifact: string | undefined = uniqueSelectedArtifacts.find(
            (artifactName: string) => {
                const safeName: string = artifactName
                    .replace(/\s+/g, "_")
                    .replace(/[^a-zA-Z0-9_]/g, "");
                return interaction.customId === `event_buy_${safeName}`;
            },
        );

        if (!chosenArtifact) {
            console.error(
                `Unexpected interaction with customId: ${interaction.customId}`,
            );
            const errorEmbed = embed.setDescription(
                "An unexpected error occurred. Please try again later.",
            );

            return message
                .edit({
                    embeds: [errorEmbed],
                    components: [],
                })
                .catch(noop);
        }

        if (userWallet.balance < coinCost) {
            const insufficientFundsEmbed = embed.setDescription(
                `You don't have enough ${customEmoji.a.z_coins} to buy \`${chosenArtifact}\`. It costs \`${coinCost} Coins\`.`,
            );

            return message
                .edit({
                    embeds: [insufficientFundsEmbed],
                    components: [],
                })
                .catch(noop);
        }

        await removeBalance(
            stats.userId,
            coinCost,
            false,
            `Purchased ${chosenArtifact} from Wandering Trader`,
        );

        const inventoryItem: InventoryItem = {
            item: chosenArtifact,
            amount: 1,
        };
        await addItemToInventory(stats.userId, [inventoryItem]);

        const purchaseEmbed = embed.setDescription(
            `You purchased \`${chosenArtifact}\` for \`${coinCost} Coins\`! The trader nods in acknowledgment and continues on his way.`,
        );

        return message
            .edit({
                embeds: [purchaseEmbed],
                components: [],
            })
            .catch(noop);
    },
});
