import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { randomNumber } from "@elara-services/packages";
import { embedComment, noop } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { addBalance, getUserStats, updateUserStats } from "../../services";
import { getRandomDrop } from "../../utils/chest";

type UserRequest = {
    id: string;
    item: string;
    quantity: number;
    reward: number;
};

export const requests = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("requests")
        .setDescription("[RPG] View or complete item requests.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("request_id")
                .setDescription("ID of the request to complete")
                .setRequired(false)
                .setAutocomplete(true),
        ),
    defer: { silent: false },
    async autocomplete(i) {
        const userId = i.user.id;
        const stats = await getUserStats(userId);

        if (!stats || !stats.requests || stats.requests.length === 0) {
            return i
                .respond([{ name: "No requests available.", value: "n/a" }])
                .catch(noop);
        }

        const focusedValue = i.options.getFocused() || "";
        const choices = stats.requests
            .filter((req) =>
                req.id.toLowerCase().includes(focusedValue.toLowerCase()),
            )
            .map((req) => ({
                name: req.id,
                value: req.id,
            }));

        if (choices.length === 0) {
            return i
                .respond([{ name: "No matching requests.", value: "n/a" }])
                .catch(noop);
        }

        return i.respond(choices.slice(0, 25)).catch(noop);
    },
    async execute(i, r) {
        try {
            const requestId = i.options.getString("request_id", false);
            const userId = i.user.id;
            const stats = await getUserStats(userId);

            if (!stats) {
                await r.edit(
                    embedComment(
                        "No stats found for you. Please set up your profile.",
                        "Red",
                    ),
                );
                return;
            }

            if (!requestId) {
                if (!stats.requests || stats.requests.length === 0) {
                    const newRequests = generateRandomRequests(
                        3,
                        stats.requests,
                    );
                    await updateUserStats(userId, {
                        requests: { set: newRequests },
                    });
                    stats.requests = newRequests;
                }

                if (!stats.requests || stats.requests.length === 0) {
                    await r.edit(
                        embedComment(
                            "ℹNo requests available at the moment.",
                            "Yellow",
                        ),
                    );
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle("`📋` Your Current Requests")
                    .setColor("Blue")
                    .setDescription(
                        `Total requests completed: \`${stats.lifetimeRequestsCompleted}\``,
                    )
                    .setThumbnail(
                        "https://lh.elara.workers.dev/rpg/requests.png",
                    );

                stats.requests.forEach((req) => {
                    embed.addFields({
                        name: `Request ID: ${req.id}`,
                        value: `>>> **Item:** \`${req.quantity}x\` ${req.item}\n**Reward:** ${customEmoji.a.z_coins} \`${req.reward}\` ${texts.c.u}`,
                    });
                });

                await r.edit({ embeds: [embed.toJSON()] });
            } else {
                const requestIndex = stats.requests.findIndex(
                    (req: UserRequest) => req.id === requestId,
                );
                if (requestIndex === -1) {
                    await r.edit(embedComment("Invalid request ID.", "Red"));
                    return;
                }

                const request = stats.requests[requestIndex];
                const item = stats.inventory.find(
                    (item) => item.item === request.item,
                );
                if (!item || item.amount < request.quantity) {
                    await r.edit(
                        embedComment(
                            `You don't have enough \`${request.item}\` to complete this request.`,
                            "Red",
                        ),
                    );
                    return;
                }

                item.amount -= request.quantity;
                if (item.amount <= 0) {
                    stats.inventory = stats.inventory.filter(
                        (it) => it.item !== request.item,
                    );
                }

                const coinReward = request.reward;
                const updatedRequests = replaceRequest(
                    stats.requests,
                    requestIndex,
                );

                stats.lifetimeRequestsCompleted += 1;

                await Promise.all([
                    updateUserStats(userId, {
                        inventory: { set: stats.inventory },
                        requests: { set: updatedRequests },
                        lifetimeRequestsCompleted:
                            stats.lifetimeRequestsCompleted,
                    }),
                    addBalance(
                        userId,
                        coinReward,
                        true,
                        `Completed request: ${request.item}`,
                    ),
                ]);

                const embed = new EmbedBuilder()
                    .setTitle("✅ Request Completed!")
                    .setColor("Green")
                    .setDescription(
                        `You received ${customEmoji.a.z_coins} \`${coinReward} ${texts.c.u}\`!`,
                    );

                await r.edit({ embeds: [embed.toJSON()] });
            }
        } catch (error) {
            console.error("Error executing /requests command:", error);
            await r.edit(
                embedComment(
                    "An error occurred while processing your request. Please try again later.",
                    "Red",
                ),
            );
        }
    },
});

function generateRandomRequests(
    count: number,
    existingRequests: UserRequest[] = [],
): UserRequest[] {
    const requests: UserRequest[] = [];
    const usedItems = new Set<string>(existingRequests.map((req) => req.item));

    for (let i = 0; i < count; i++) {
        let drop;

        let attempts = 0;
        do {
            drop = getRandomDrop();
            attempts++;
            if (attempts > 10) {
                break;
            }
        } while (usedItems.has(drop.name) && attempts < 10);

        usedItems.add(drop.name);

        const reward = randomNumber({
            min: 50,
            max: 300,
            integer: true,
        });
        requests.push({
            id: generateUniqueId(),
            item: drop.name,
            quantity: drop.quantity,
            reward,
        });
    }
    return requests;
}

function replaceRequest(requests: UserRequest[], index: number): UserRequest[] {
    const newRequests = [...requests];
    const newDrop = getRandomDropWithReward(requests);
    newRequests[index] = {
        id: generateUniqueId(),
        item: newDrop.name,
        quantity: newDrop.quantity,
        reward: newDrop.reward,
    };
    return newRequests;
}

function generateUniqueId(): string {
    return Math.random().toString(36).substring(2, 10);
}

function getRandomDropWithReward(existingRequests: UserRequest[]): {
    name: string;
    quantity: number;
    reward: number;
} {
    let drop;
    const usedItems = new Set<string>(existingRequests.map((req) => req.item));
    let attempts = 0;
    do {
        drop = getRandomDrop();
        attempts++;
        if (attempts > 10) {
            break;
        }
    } while (usedItems.has(drop.name) && attempts < 10);

    const reward = randomNumber({
        min: 50,
        max: 300,
        integer: true,
    });
    return { name: drop.name, quantity: drop.quantity, reward };
}
