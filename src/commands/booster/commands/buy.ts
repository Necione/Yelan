import { buildCommand, type SubCommand } from "@elara-services/botbuilder";
import {
    discord,
    embedComment,
    formatNumber,
    get,
    getInteractionResponder,
    is,
    noop,
} from "@elara-services/utils";
import { texts } from "@liyueharbor/econ";
import {
    ActionRowBuilder,
    GuildScheduledEventEntityType,
    GuildScheduledEventPrivacyLevel,
    GuildScheduledEventStatus,
    TextInputBuilder,
    TextInputStyle,
    type ButtonInteraction,
    type Interaction,
} from "discord.js";
import { channels, roles } from "../../../config";
import {
    addBalance,
    getProfileByUserId,
    removeBalance,
} from "../../../services";
import {
    addCoinBooster,
    boosterExpiryDuration,
    getActiveCoinBoosters,
} from "../../../services/booster";
import { getAmount, getTax, locked, userLockedData } from "../../../utils";
import {
    boosterPrices,
    boostersLimitExceeded,
    buyBoosterEmbed,
    insufficientBalanceEmbed,
} from "../common";

export const buy = buildCommand<SubCommand>({
    subCommand: (b) =>
        b
            .setName(`buy`)
            .setDescription(`Buy an XP booster`)
            .addStringOption((option) =>
                option
                    .setRequired(true)
                    .addChoices(
                        ...boosterPrices
                            .sort((a, b) => b.price - a.price)
                            .map((x) => ({
                                name: `${x.name} (${formatNumber(x.price)} ${
                                    texts.c.u
                                })`,
                                value: x.name,
                            })),
                    )
                    .setName("level")
                    .setDescription("Boost Level to buy"),
            ),
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const levelArg = i.options.getString("level", true);
        // If user is not buying
        if (!levelArg) {
            return;
        }

        // If user is buying
        const userProfile = await getProfileByUserId(i.user.id);
        if (userProfile.locked) {
            locked.del(i.user.id);
            return r.edit(userLockedData(userProfile.userId));
        }
        const booster = boosterPrices.find((x) => x.name === levelArg);
        if (!booster) {
            locked.del(i.user.id);
            return r.edit(embedComment(`Cannot find booster: ${levelArg}`));
        }
        if (userProfile.balance < booster.price) {
            locked.del(i.user.id);
            return r.edit({
                embeds: [
                    insufficientBalanceEmbed(
                        userProfile.balance,
                        booster.price,
                    ),
                ],
            });
        }

        // Check if there is already active boosters
        const activeBoosters = await getActiveCoinBoosters();
        // Only allow 3 boosters at a time
        if (activeBoosters.length >= 3) {
            if (!i.member.roles.cache.hasAny(...roles.main)) {
                locked.del(i.user.id);
                return r.edit({ embeds: [boostersLimitExceeded()] });
            }
        }

        const addedBooster = await addCoinBooster({
            multiplier: booster.multiplier,
            purchasedByUserId: i.user.id,
        });

        await Promise.all([
            removeBalance(
                i.user.id,
                booster.price,
                false,
                `Via booster ${buy.subCommand.name}`,
            ),
            r.edit(
                embedComment(
                    `✔ Successfully bought the ${booster.name} for ${getAmount(
                        booster.price,
                    )}`,
                    "Green",
                ),
            ),
        ]);

        let totalTip = 0;

        const message = await discord.messages.send({
            client: i.client,
            channelId: channels.general,
            options: buyBoosterEmbed(
                i.user.id,
                booster.name,
                booster.price,
                booster.multiplier.toString(),
                addedBooster.expiredAt,
                totalTip,
            ),
        });

        if (!message) {
            locked.del(i.user.id);
            return;
        }
        locked.del(i.user.id);
        const startTime = new Date(
            addedBooster.expiredAt.getTime() - boosterExpiryDuration,
        ).getTime();
        const event = await i.guild.scheduledEvents
            .create({
                name: `${booster.multiplier}x ${texts.c.s} Booster ⚡`,
                description: `For the next 10 minutes you can thank them by providing a tip on this ${message.url} message!`,
                entityType: GuildScheduledEventEntityType.External,
                privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
                scheduledStartTime: startTime + get.secs(10),
                scheduledEndTime: addedBooster.expiredAt.getTime(),
                entityMetadata: {
                    location: `Bought by: @${i.user.tag}`,
                },
            })
            .catch(noop);
        const start = Date.now() - startTime;
        if (event) {
            if (!start.toString().startsWith("-")) {
                await event
                    .edit({ status: GuildScheduledEventStatus.Active })
                    .catch(noop);
            }
        }
        const collector = message.createMessageComponentCollector({
            time: get.mins(10),
            filter: (ii: Interaction) =>
                !ii.user.bot && ii.user.id !== i.user.id,
        });

        collector.on("collect", async (m: ButtonInteraction) => {
            if (!m.inCachedGuild()) {
                return;
            }
            let amount = 10;
            let removeFrom = 10;
            if (m.customId === "custom_tip") {
                await m
                    .showModal({
                        customId: `custom_tip`,
                        title: `Custom Tip (Taxed)`,
                        components: [
                            new ActionRowBuilder<TextInputBuilder>().addComponents(
                                new TextInputBuilder()
                                    .setCustomId(`amount`)
                                    .setMinLength(1)
                                    .setMaxLength(200)
                                    .setLabel(`Amount`)
                                    .setValue(`${amount}`)
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short),
                            ),
                        ],
                    })
                    .catch(noop);
                const col = await m
                    .awaitModalSubmit({
                        filter: (ii) =>
                            ii.user.id === m.user.id &&
                            ii.customId.startsWith("custom_tip"),
                        time: get.secs(30),
                    })
                    .catch(noop);
                if (!col) {
                    return;
                }
                await col.deferReply({ ephemeral: true }).catch(noop);
                amount = parseInt(col.fields.getTextInputValue("amount"));
                removeFrom = Math.floor(
                    amount + (await getTax(amount, m.member)),
                );
                // @ts-ignore
                m = col;
            }

            const responder = getInteractionResponder(m);
            await responder.defer({ ephemeral: true });
            if (!is.number(amount)) {
                return void responder.edit(
                    embedComment(`You provided an invalid amount.`),
                );
            }
            const tipper = await getProfileByUserId(m.user.id);
            if (tipper.balance < amount) {
                return void responder.edit(
                    embedComment(`You don't have enough ${texts.c.u} to tip.`),
                );
            }
            await Promise.all([
                removeBalance(
                    m.user.id,
                    removeFrom,
                    false,
                    `Via booster ${buy.subCommand.name} (tip)`,
                ),
                addBalance(
                    i.user.id,
                    amount,
                    false,
                    `Via booster ${buy.subCommand.name} (tip)`,
                ),
            ]);
            totalTip += amount;

            await responder.edit(
                embedComment(
                    `You tipped <@${i.user.id}> for ${getAmount(amount)}`,
                    "Green",
                ),
            );
            await message.edit(
                buyBoosterEmbed(
                    i.user.id,
                    booster.name,
                    booster.price,
                    booster.multiplier.toString(),
                    addedBooster.expiredAt,
                    totalTip,
                ),
            );
        });

        collector.on("end", async () => {
            if (event) {
                await event.edit({ description: `` }).catch(noop);
            }
            await message.edit({
                ...buyBoosterEmbed(
                    i.user.id,
                    booster.name,
                    booster.price,
                    booster.multiplier.toString(),
                    addedBooster.expiredAt,
                    totalTip,
                ),
                components: [],
            });
        });
    },
});
