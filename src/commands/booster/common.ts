import { addButtonRow, get, make, time } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";
import { ButtonStyle, Colors, EmbedBuilder } from "discord.js";
import { boosterExpiryDuration } from "../../services/booster";
import { getAmount } from "../../utils";

export const duration = get.hrs(1);
export const boosterPrices = make.array<{
    name: string;
    price: number;
    multiplier: number;
}>([
    {
        name: "1.5x Booster",
        price: 750,
        multiplier: 1.5,
    },
    {
        name: "2.0x Booster",
        price: 1000,
        multiplier: 2,
    },
    {
        name: "2.5x Booster",
        price: 2000,
        multiplier: 2.5,
    },
]);

export const baseEmbed = () =>
    new EmbedBuilder()
        .setTitle(`${customEmoji.a.z_coins} Global ${texts.c.s} Boosters`)
        .setColor(Colors.Gold)
        .setFooter({ text: "Use /booster to buy booster!" });

export const insufficientBalanceEmbed = (userBalance: number, price: number) =>
    baseEmbed().setDescription(
        `You do not have ${getAmount(price)}\n\nBalance: ${getAmount(
            userBalance,
        )}`,
    );

export const boostersLimitExceeded = () =>
    baseEmbed().setDescription(
        "There are a lot of boosters queued. Please wait for some to expire first.",
    );

export const buyBoosterEmbed = (
    userId: string,
    level: string,
    price: number,
    multiplier: string,
    expiredAt: Date,
    totalTipReceived: number,
) => {
    const row = addButtonRow([
        {
            label: "Tip",
            id: "tip",
            style: ButtonStyle.Success,
            emoji: "🪙",
        },
        {
            label: "Custom Tip",
            id: "custom_tip",
            style: ButtonStyle.Primary,
            emoji: "🪙",
        },
    ]);
    const from = time.short.time(
        new Date(expiredAt.getTime() - boosterExpiryDuration),
    );
    const to = time.short.time(expiredAt);

    const tipString =
        totalTipReceived <= 0
            ? ""
            : `\n\nTip collected: ${getAmount(totalTipReceived)}`;

    const embed = baseEmbed().setDescription(
        `<@${userId}> has bought everyone a \`${level}\` for ${getAmount(
            price,
        )}.
Everyone will earn \`${multiplier}x\` ${texts.c.u} from ${from} - ${to}! 
Press the button below to tip <@${userId}> ${getAmount(10)}. ${tipString}`,
    );
    return {
        embeds: [embed],
        components: [row],
    };
};
