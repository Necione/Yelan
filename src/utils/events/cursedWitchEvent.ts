import { addButtonRow, awaitComponent, get, noop } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import { ButtonStyle, EmbedBuilder, type Message } from "discord.js";
import { startHunt } from "../../commands/rpg/handlers/huntHandler";
import { getUserStats, updateUserStats } from "../../services";

export async function cursedWitchEvent(message: Message, stats: UserStats) {
    const ids = {
        acceptForced: "event_accept_forced",
        fight: "event_fight_witch",
    };

    const embed = new EmbedBuilder()
        .setTitle("A Cursed Witch Appears!")
        .setDescription(
            "You encounter a cursed witch who cackles and forcibly casts a spell on you. You can accept your fate or attempt to fight back.",
        )
        .setColor("DarkPurple");

    await message
        .edit({
            embeds: [embed],
            components: [
                addButtonRow([
                    {
                        id: ids.acceptForced,
                        label: "Accept Your Fate",
                        style: ButtonStyle.Secondary,
                    },
                    {
                        id: ids.fight,
                        label: "Fight the Witch",
                        style: ButtonStyle.Danger,
                    },
                ]),
            ],
        })
        .catch(noop);

    const c = await awaitComponent(message, {
        filter: (int) => int.customId.startsWith("event_"),
        users: [{ allow: true, id: stats.userId }],
        time: get.secs(10),
    });

    if (!c) {
        return message
            .edit({
                embeds: [
                    embed.setDescription(
                        "The witch vanishes, but her curse lingers in the air. Perhaps you were spared this time.",
                    ),
                ],
                components: [],
            })
            .catch(noop);
    }

    if (c.customId === ids.fight) {
        // Player chooses to fight the witch
        if (
            stats.isHunting ||
            stats.isTravelling ||
            stats.hp <= 0 ||
            stats.abyssMode
        ) {
            return message
                .edit({
                    embeds: [
                        embed.setDescription(
                            "You attempt to fight the witch, but you're currently unable to engage in battle due to your current state.",
                        ),
                    ],
                    components: [],
                })
                .catch(noop);
        }

        await message
            .edit({
                embeds: [
                    embed.setDescription(
                        "You dare to challenge the witch! She summons a **Tenebrous Papilla** to fight you!",
                    ),
                ],
                components: [],
            })
            .catch(noop);

        if (
            "send" in message.channel &&
            typeof message.channel.send === "function"
        ) {
            const msg = await message.channel
                .send({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(
                                `Prepare to battle the **Tenebrous Papilla** summoned by the witch!`,
                            )
                            .setColor("DarkPurple"),
                    ],
                })
                .catch(noop);

            if (msg) {
                await startHunt(msg, c.user, ["Tenebrous Papilla"]);
            }
        } else {
            await message.reply(
                "Unable to start the battle due to channel limitations.",
            );
        }

        return;
    }

    // If not fighting, player accepts their fate and receives a curse as before
    const outcome = Math.random();
    let effectName = "";
    let effectValue = 0;
    let remainingUses = 0;

    if (outcome < 0.5) {
        effectName = "Poisoning";
        effectValue = -0.2;
        remainingUses = 3;
        await message
            .edit({
                embeds: [
                    embed.setDescription(
                        `The witch cackles as her curse takes hold! You have been inflicted with **Poisoning** for the next **${remainingUses} rounds**.`,
                    ),
                ],
                components: [],
            })
            .catch(noop);
    } else {
        effectName = "Weakness";
        effectValue = -0.2;
        remainingUses = 10;
        await message
            .edit({
                embeds: [
                    embed.setDescription(
                        `The witch's curse weakens your strength! You have been inflicted with **Weakness** for the next **${remainingUses} rounds**.`,
                    ),
                ],
                components: [],
            })
            .catch(noop);
    }

    const newEffect = {
        name: effectName,
        effectValue,
        remainingUses,
    };

    const updatedStats = await getUserStats(stats.userId);
    if (updatedStats) {
        updatedStats.activeEffects = updatedStats.activeEffects.filter(
            (effect) => effect.remainingUses > 0,
        );

        const existingEffectIndex = updatedStats.activeEffects.findIndex(
            (effect) => effect.name === effectName,
        );

        if (existingEffectIndex !== -1) {
            updatedStats.activeEffects[existingEffectIndex].remainingUses +=
                remainingUses;
        } else {
            updatedStats.activeEffects.push(newEffect);
        }

        await updateUserStats(stats.userId, {
            activeEffects: {
                set: updatedStats.activeEffects,
            },
        });
    }
}
