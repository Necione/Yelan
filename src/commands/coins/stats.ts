import type { SlashCommand } from "@elara-services/botbuilder";
import { field, formatNumber } from "@elara-services/utils";
import {
    EmbedBuilder,
    SlashCommandBuilder,
    type APIEmbedField,
} from "discord.js";
import { roles } from "../../config";
import { getProfileByUserId } from "../../services";
import {
    customEmoji,
    getRandomImage,
    percentage,
    texts,
    userLockedData,
} from "../../utils";

const highRollerRequirement = 1_000_000;

export const stats: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName(`stats`)
        .setDescription(`Get your account stats`)
        .setDMPermission(false)
        .addUserOption((o) =>
            o.setName(`user`).setDescription(`Which user?`).setRequired(false),
        )
        .addBooleanOption((o) =>
            o
                .setName(`public`)
                .setDescription(
                    `Should the response be public? (default: False)`,
                )
                .setRequired(false),
        ),
    execute: async (interaction, responder) => {
        if (!interaction.inCachedGuild()) {
            return;
        }
        await responder.defer({
            ephemeral: interaction.options.getBoolean("public", false)
                ? false
                : true,
        });
        const user =
            interaction.options.getUser("user", false) || interaction.user;
        const data = await getProfileByUserId(user.id);
        const wagered = Math.floor(
            (data.balanceAdded || 0) + (data.balanceRemove || 0),
        );

        if (data.locked) {
            return responder.edit(userLockedData(user.id));
        }
        const profits = Math.floor(
            (data.balanceAdded || 0) - (data.balanceRemove || 0),
        );
        function map(str: string[]) {
            return str
                .map((c) => `${customEmoji.a.z_arrow_blue} ${c}`)
                .join("\n");
        }
        const fields: APIEmbedField[] = [];
        const highRoller = interaction.guild.roles.resolve(roles.highRoller);
        if (!highRoller?.members.has(user.id)) {
            const getPercent = percentage(wagered, highRollerRequirement);
            if (getPercent >= 100) {
                fields.push(
                    field(
                        `High Roller`,
                        `You've wagered enough for this role, claim it in <#1177437750782349333> by submitting a (\`General & Help\`) ticket!`,
                    ),
                );
            } else {
                fields.push(
                    field(
                        `✦ High Roller`,
                        `Need to wager ${
                            customEmoji.a.z_coins
                        } \`${formatNumber(highRollerRequirement)} ${
                            texts.c.u
                        }\` (**${getPercent.toFixed(0)}%** done)`,
                    ),
                );
            }
        }

        return responder.edit({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({
                        name: `${user.displayName}`,
                        iconURL: user.displayAvatarURL(),
                    })
                    .setTitle(`Your Economy Stats`)
                    .setFooter({ text: `ID: ${user.id}` })
                    .addFields(
                        {
                            name: "✦ Mora",
                            value: map([
                                `Earned: ${formatNumber(
                                    data.balanceAdded || 0,
                                )}`,
                                `Lost: ${formatNumber(
                                    data.balanceRemove || 0,
                                )}`,
                                `Profits: ${formatNumber(profits)}`,
                            ]),
                        },
                        ...fields,
                    )
                    .setColor(0xc0f6fb)
                    .setImage(getRandomImage()),
            ],
        });
    },
};
