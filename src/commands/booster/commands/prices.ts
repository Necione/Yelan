import { buildCommand, type SubCommand } from "@elara-services/botbuilder";
import { formatNumber } from "@elara-services/utils";
import { customEmoji, texts } from "../../../utils";
import { baseEmbed, boosterPrices } from "../common";

export const prices = buildCommand<SubCommand>({
    subCommand: (b) =>
        b.setName(`prices`).setDescription(`View the booster prices`),
    async execute(i, r) {
        await r.edit({
            embeds: [
                baseEmbed().setDescription(
                    boosterPrices
                        .sort((a, b) => b.price - a.price)
                        .map(
                            (price) =>
                                `- \`${price.multiplier} Booster\`\n - Price: ${
                                    customEmoji.a.z_coins
                                } \`${formatNumber(price.price)} ${
                                    texts.c.u
                                }\``,
                        )
                        .join("\n"),
                ),
            ],
        });
    },
});
