import { randomNumber } from "@elara-services/packages";
import { formatNumber, make } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { Colors, EmbedBuilder } from "discord.js";
import { addSlotsPrizePool, getSlots } from "../services";

const transpose = <T>(array: T[][]) => {
    return array[0].map((_: T, colIndex: number) =>
        array.map((row) => row[colIndex]),
    );
};

const wins = make.array<{ emoji: SlotItemType; multiplier: number }>([
    { emoji: ":heart:", multiplier: 5 },
    { emoji: ":gem:", multiplier: 5 },
    { emoji: ":bell:", multiplier: 4 },
    { emoji: ":four_leaf_clover:", multiplier: 4 },
    { emoji: ":watermelon:", multiplier: 3 },
    { emoji: ":tangerine:", multiplier: 3 },
    { emoji: ":lemon:", multiplier: 2 },
    { emoji: ":grapes:", multiplier: 2 },
]);

const slotStrip = [
    customEmoji.a.seven,
    ":cherries:",
    ":grapes:",
    ":lemon:",
    ":tangerine:",
    ":watermelon:",
    ":four_leaf_clover:",
    ":bell:",
    ":gem:",
    ":heart:",
];

type SlotItemType = (typeof slotStrip)[number];
type SlotItemTypeWithRandom = SlotItemType | "RANDOM";

function pickRandomSlotItem(excludes: SlotItemType[] = []): SlotItemType {
    const local = slotStrip.filter((c) => !excludes.includes(c));
    return local[Math.floor(Math.random() * local.length)];
}

function selectSlotItem(
    item: SlotItemType,
): [SlotItemType, SlotItemType, SlotItemType] {
    if (!slotStrip.find((x) => x === item)) {
        throw new Error(`Invalid slot item: ${item}`);
    }

    const middle = item;
    const top = pickRandomSlotItem([middle]);
    const bottom = pickRandomSlotItem([middle, top]);
    return [top, middle, bottom];
}

export function renderSlotDisplay(
    slotDisplay: string[][],
    showColumn: 0 | 1 | 2 | 3,
) {
    const renderedDisplay = [
        [
            customEmoji.a.slotSpinAnimation,
            customEmoji.a.slotSpinAnimation,
            customEmoji.a.slotSpinAnimation,
        ],
        [
            customEmoji.a.slotSpinAnimation,
            customEmoji.a.slotSpinAnimation,
            customEmoji.a.slotSpinAnimation,
        ],
        [
            customEmoji.a.slotSpinAnimation,
            customEmoji.a.slotSpinAnimation,
            customEmoji.a.slotSpinAnimation,
        ],
    ];

    for (let i = 0; i < showColumn; i++) {
        renderedDisplay[0][i] = slotDisplay[0][i];
        renderedDisplay[1][i] = slotDisplay[1][i];
        renderedDisplay[2][i] = slotDisplay[2][i];
    }

    return `\`  \` ${renderedDisplay[0][0]}\`|\`${renderedDisplay[0][1]}\`|\`${renderedDisplay[0][2]} \`  \`
\`>>\` ${renderedDisplay[1][0]}\`|\`${renderedDisplay[1][1]}\`|\`${renderedDisplay[1][2]} \`<<\`
\`  \` ${renderedDisplay[2][0]}\`|\`${renderedDisplay[2][1]}\`|\`${renderedDisplay[2][2]} \`  \``;
}

interface SlotResult {
    status: "win" | "lose" | "draw" | "jackpot";
    result: {
        winAmount: number;
        slotDisplay: string[][];
    };
}

type innerItem = [SlotItemType, SlotItemType, SlotItemType];

const getSlotDisplay = (
    item1: SlotItemTypeWithRandom,
    item2: SlotItemTypeWithRandom,
    item3: SlotItemTypeWithRandom,
) => {
    let innerItem1: innerItem;
    let innerItem2: innerItem;
    let innerItem3: innerItem;
    if (item1 === "RANDOM") {
        innerItem1 = selectSlotItem(pickRandomSlotItem([":cherry:"]));
    } else {
        innerItem1 = selectSlotItem(item1);
    }

    if (item2 === "RANDOM") {
        innerItem2 = selectSlotItem(pickRandomSlotItem([innerItem1[1]]));
    } else {
        innerItem2 = selectSlotItem(item2);
    }

    if (item3 === "RANDOM") {
        innerItem3 = selectSlotItem(
            pickRandomSlotItem([innerItem1[1], innerItem2[1]]),
        );
    } else {
        innerItem3 = selectSlotItem(item3);
    }

    return transpose([innerItem1, innerItem2, innerItem3]);
};

export async function playSlot(bet: number): Promise<SlotResult> {
    const result: SlotResult = {
        status: "lose",
        result: {
            winAmount: 0,
            slotDisplay: [
                ["", "", ""],
                ["", "", ""],
                ["", "", ""],
            ],
        },
    };

    const roll = randomNumber({ integer: true, max: 1000, min: 1 });
    result.result.slotDisplay = getSlotDisplay("RANDOM", "RANDOM", "RANDOM");

    const cherryCount = result.result.slotDisplay[1].filter((item) =>
        item.includes("cherries"),
    ).length;
    if (roll <= 550) {
        await addSlotsPrizePool(Math.floor(bet * 0.5));
    } else if (roll <= 750 && roll > 550) {
        if (cherryCount === 1) {
            result.status = "draw";
        }
    } else if (roll <= 925 && roll > 750) {
        if (cherryCount === 2) {
            result.status = "win";
            result.result.winAmount = Math.round(bet * 1.25);
        } else if (cherryCount === 3) {
            result.status = "win";
            result.result.winAmount = Math.round(bet * 1.5);
        }
    } else if (roll <= 990 && roll > 925) {
        const innerRoll = randomNumber({
            integer: true,
            min: 0,
            max: wins.length - 1,
        });
        const selectedWin = wins[innerRoll];
        result.result.slotDisplay = getSlotDisplay(
            selectedWin.emoji,
            selectedWin.emoji,
            selectedWin.emoji,
        );
        result.status = "win";
        result.result.winAmount = Math.round(bet * selectedWin.multiplier);
    } else {
        const prizePool = (await getSlots()).prizePool;
        const jackpotChance = Math.min(prizePool / 2000, 100);

        if (roll > 1000 - jackpotChance) {
            result.result.slotDisplay = getSlotDisplay(
                customEmoji.a.seven,
                customEmoji.a.seven,
                customEmoji.a.seven,
            );
            result.status = "jackpot";
            result.result.winAmount = Math.round(bet + prizePool);
        }
    }

    return result;
}

const halfLength = Math.ceil(wins.length / 2);
const firstHalfWins = wins.slice(0, halfLength);
const secondHalfWins = wins.slice(halfLength);

type WinItem = { emoji: string; multiplier: number };

function generateWinningsDescription(winsArray: WinItem[]): string {
    return winsArray
        .map(
            (win) =>
                `${win.emoji} ${win.emoji} ${
                    win.emoji
                } - \`${win.multiplier.toFixed(1)}x\``,
        )
        .join("\n");
}

export const embeds = {
    base: () =>
        new EmbedBuilder()
            .setTitle("<a:JPslots:1184672918953803917> The Slots Machine")
            .setColor(Colors.Gold),
    description: (jackpot: number, lastWonBy: string) =>
        embeds
            .base()
            .addFields({
                name: "✦ Current Jackpot",
                value: `Winning Prize: ${customEmoji.a.z_coins} \`${jackpot} ${texts.c.u}\`\nLast won by: ${lastWonBy}`,
                inline: false,
            })
            .addFields({
                name: "✦ Possible Winnings",
                value: generateWinningsDescription(firstHalfWins),
                inline: true,
            })
            .addFields({
                name: "\u200B",
                value: generateWinningsDescription(secondHalfWins),
                inline: true,
            })
            .addFields({
                name: "✦ Other Possibilities",
                value: ":cherries: - `1.0x` | `1.25x` | `1.5x`",
                inline: false,
            }),
    tooPoor: (balance: number) =>
        embeds
            .base()
            .setDescription(
                `You are too poor to be gambling :(\n\nYour balance: ${
                    customEmoji.a.z_coins
                } \`${formatNumber(balance)} ${texts.c.u}\``,
            ),
    play: (slotResult: string) =>
        embeds
            .base()
            .addFields({ name: "\u200B", value: slotResult })
            .setDescription(
                `The slot machine is rolling ${customEmoji.a.loading}`,
            ),
    result: (slotResult: SlotResult, userId: string, balance: number) => {
        const base = () =>
            embeds.base().setFooter({
                text: `Your Balance: ${formatNumber(balance)} ${texts.c.u}`,
            });
        if (slotResult.status === "draw") {
            return base()
                .addFields({
                    name: "\u200B",
                    value: renderSlotDisplay(slotResult.result.slotDisplay, 3),
                })
                .setDescription(
                    `<@${userId}> didn't win or lose ${texts.c.u}!`,
                );
        }
        if (slotResult.status === "win") {
            return base()
                .addFields({
                    name: "\u200B",
                    value: renderSlotDisplay(slotResult.result.slotDisplay, 3),
                })
                .setDescription(
                    `<@${userId}> won ${customEmoji.a.z_coins} \`${formatNumber(
                        slotResult.result.winAmount,
                    )} ${texts.c.u}\`!`,
                );
        }
        if (slotResult.status === "jackpot") {
            return base()
                .addFields({
                    name: "\u200B",
                    value: renderSlotDisplay(slotResult.result.slotDisplay, 3),
                })
                .setDescription(
                    `<@${userId}> won the **jackpot** ! They have won ${
                        customEmoji.a.z_coins
                    } \`${formatNumber(slotResult.result.winAmount)} ${
                        texts.c.u
                    }\`!`,
                );
        }
        if (slotResult.status === "lose") {
            return base()
                .addFields({
                    name: "\u200B",
                    value: renderSlotDisplay(slotResult.result.slotDisplay, 3),
                })
                .setDescription(
                    `<@${userId}> didn't win, better luck next time.`,
                );
        }
        return embeds.base().setDescription("Unknown error occured");
    },
};
