import { embedComment } from "@elara-services/utils";
import type { UserStats } from "@prisma/client";
import type {
    ChatInputCommandInteraction,
    Message,
    TextChannel,
} from "discord.js";
import { EmbedBuilder } from "discord.js";
import { updateUserStats } from "../../../services";

export async function handleTrap(
    i: ChatInputCommandInteraction,
    stats: UserStats,
): Promise<void> {
    const numberOfDigits = Math.floor(Math.random() * 2) + 4;
    const numbers: number[] = [];
    for (let j = 0; j < numberOfDigits; j++) {
        numbers.push(Math.floor(Math.random() * 90) + 10);
    }

    const sortAscending = Math.random() < 0.5;
    const sortOrder = sortAscending ? "ascending" : "descending";

    const trapEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("You Fell Into a Trap!")
        .setThumbnail("https://lh.elara.workers.dev/rpg/paimon/shock.png")
        .setDescription(
            `A hidden trap springs! Arrange the following numbers in **${sortOrder} order** within **10 seconds**.\n\n` +
                `\`${numbers.join(", ")}\``,
        );

    await i.followUp({ embeds: [trapEmbed] });

    const filter = (m: Message) => m.author.id === i.user.id;
    const collector = (i.channel as TextChannel)?.createMessageCollector({
        filter,
        time: 10000,
        max: 1,
    });

    if (!collector) {
        await i.followUp(
            embedComment(
                "Unable to create a message collector for the trap.",
                "Red",
            ),
        );
        return;
    }

    collector.on("collect", async (m: Message) => {
        const playerInput = m.content.trim();

        const playerNumbers = playerInput
            .split(/[\s,]+/)
            .map((num) => parseInt(num, 10));

        if (
            playerNumbers.length !== numbers.length ||
            playerNumbers.some(isNaN)
        ) {
            await i.followUp(
                embedComment(
                    "Invalid input format. You failed to disarm the trap.",
                    "Red",
                ),
            );
            await applyTrapDamage(i, stats);
            return;
        }

        const sortedNumbers = [...numbers].sort((a, b) => a - b);
        const sortedDescending = [...numbers].sort((a, b) => b - a);
        const isCorrectAscending = playerNumbers.every(
            (num, idx) => num === sortedNumbers[idx],
        );
        const isCorrectDescending = playerNumbers.every(
            (num, idx) => num === sortedDescending[idx],
        );

        if (
            (sortAscending && isCorrectAscending) ||
            (!sortAscending && isCorrectDescending)
        ) {
            await i.followUp(
                embedComment("You successfully disarmed the trap!", "Green"),
            );
        } else {
            await i.followUp(
                embedComment(
                    "Incorrect arrangement. The trap activates!",
                    "Red",
                ),
            );
            await applyTrapDamage(i, stats);
        }
    });

    collector.on("end", async (collected) => {
        if (collected.size === 0) {
            await i.followUp(
                embedComment(
                    "You failed to respond in time. The trap activates!",
                    "Red",
                ),
            );
            await applyTrapDamage(i, stats);
        }
    });
}

async function applyTrapDamage(
    i: ChatInputCommandInteraction,
    stats: UserStats,
): Promise<void> {
    const newHP = Math.max(stats.hp - 50, 0);
    await updateUserStats(i.user.id, { hp: newHP });

    const damageEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("Trap Activated!")
        .setDescription(`You lost **50 HP** due to the trap.`)
        .addFields({
            name: "Current HP",
            value: `\`${newHP}/${stats.maxHP}\``,
        });

    await i.followUp({ embeds: [damageEmbed] });

    if (newHP <= 0) {
        await i.followUp(
            embedComment("You have been defeated by the trap...", "Red"),
        );
    }
}
