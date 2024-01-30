import { buildCommand, type SubCommand } from "@elara-services/botbuilder";
import type { GlobalBooster } from "@prisma/client";
import { getActiveCoinBoosters } from "../../../services/booster";
import { baseEmbed } from "../common";

const noBoosterEmbed = () =>
    baseEmbed().setDescription(
        "There are no active booster(s). Be the first one!",
    );

const boosterListEmbed = (boosters: GlobalBooster[]) => {
    let desc = "";
    let numbering = 1;
    for (let i = 0; i < boosters.length; i++) {
        const { expiredAt, multiplier, purchasedByUserId } = boosters[i];

        if (new Date().getTime() > expiredAt.getTime()) {
            continue;
        }
        if (desc.length >= 4000) {
            continue;
        }
        const isActive = numbering === 1;
        if (isActive) {
            desc += `${numbering++}. <@${purchasedByUserId}> \`${multiplier}x\` expires ${`<t:${Math.floor(
                expiredAt.getTime() / 1000,
            )}:R> **ACTIVE**`}\n`;
        } else {
            desc += `${numbering++}. <@${purchasedByUserId}> \`${multiplier}x\` *(queued)*\n`;
        }
    }

    if (!desc) {
        return noBoosterEmbed();
    }
    return baseEmbed().setDescription(desc);
};

export const list = buildCommand<SubCommand>({
    subCommand: (b) =>
        b
            .setName(`list`)
            .setDescription(`View the current and upcoming boosters queue`),
    async execute(i, r) {
        const boosters = await getActiveCoinBoosters();

        if (boosters.length <= 0) {
            return r.edit({
                embeds: [noBoosterEmbed()],
            });
        }
        return r.edit({ embeds: [boosterListEmbed(boosters)] });
    },
});
