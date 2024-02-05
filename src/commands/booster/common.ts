import { addButtonRow, formatNumber, get } from "@elara-services/utils";
import { ButtonStyle, Colors, EmbedBuilder } from "discord.js";
import { customEmoji, texts } from "../../utils";
import { boosterExpiryDuration } from "../../services/booster";

export const duration = get.hrs(1); // 1h
export const boosterPrices: {
    name: string;
    price: number;
    multiplier: number;
}[] = [
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
];

export const baseEmbed = () =>
    new EmbedBuilder()
        .setTitle(`${customEmoji.a.z_coins} Global ${texts.c.s} Boosters`)
        .setColor(Colors.Gold)
        .setFooter({ text: "Use /booster to buy booster!" });

export const insufficientBalanceEmbed = (userBalance: number, price: number) =>
    baseEmbed().setDescription(
        `You do not have ${customEmoji.a.z_coins} \`${price} ${texts.c.u}\`\n\nBalance: ${customEmoji.a.z_coins} \`${userBalance} ${texts.c.u}\``,
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
    const from = `<t:${Math.round(
        (expiredAt.getTime() - boosterExpiryDuration) / 1000,
    )}:t>`;
    const to = `<t:${Math.round(expiredAt.getTime() / 1000)}:t>`;

    const tipString =
        totalTipReceived <= 0
            ? ""
            : `\n\nTip collected: ${customEmoji.a.z_coins} \`${formatNumber(
                  totalTipReceived,
              )} ${texts.c.u}\``;

    const embed = baseEmbed().setDescription(
        `<@${userId}> has bought everyone a \`${level}\` for ${customEmoji.a.z_coins} \`${price} ${texts.c.u}\`.
Everyone will earn \`${multiplier}x\` ${texts.c.u} from ${from} - ${to}! 
Press the button below to tip <@${userId}> 10 ${texts.c.u}. ${tipString}`,
    );
    return {
        embeds: [embed],
        components: [row],
    };
};
