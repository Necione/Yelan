import { type UserStats } from "@prisma/client";
import { debug } from "../../../utils";
import { type Monster } from "../../../utils/hunt";
import { type MonsterState } from "./battleHandler";

type SpellHandler = (params: {
    stats: UserStats;
    monster: Monster;
    monsterState: MonsterState;
    currentPlayerHp: number;
    currentMonsterHp: number;
    messages: string[];
}) => Promise<{
    currentPlayerHp: number;
    currentMonsterHp: number;
    monsterState?: MonsterState;
}>;

export const spellHandlers: Record<string, SpellHandler> = {
    Heal: async ({ stats, currentPlayerHp, currentMonsterHp, messages }) => {
        const healAmount = Math.floor(0.15 * stats.maxHP);
        currentPlayerHp = Math.min(currentPlayerHp + healAmount, stats.maxHP);

        messages.push(
            `\`✨\` Heal spell casted! Restored \`${healAmount}\` HP`,
        );
        debug(`[${stats.userId}] Heal spell: Restored ${healAmount} HP`);

        return { currentPlayerHp, currentMonsterHp };
    },

    Fury: async ({ stats, currentPlayerHp, currentMonsterHp, messages }) => {
        stats.attackPower *= 2;
        messages.push(
            "`⚡` Fury spell casted! Your next attack will deal double damage",
        );
        debug(
            `[${stats.userId}] Fury spell: Attack power doubled to ${stats.attackPower}`,
        );

        return { currentPlayerHp, currentMonsterHp };
    },

    Burn: async ({
        stats,
        monster,
        currentPlayerHp,
        currentMonsterHp,
        messages,
    }) => {
        const burnDamage = Math.floor(0.5 * currentMonsterHp);
        currentMonsterHp = Math.max(currentMonsterHp - burnDamage, 0);

        messages.push(
            `\`🔥\` Burn spell casted! Dealt \`${burnDamage}\` damage to the ${monster.name}`,
        );
        debug(
            `[${stats.userId}] Burn spell: Dealt ${burnDamage} damage to ${monster.name}`,
        );

        return { currentPlayerHp, currentMonsterHp };
    },

    Cripple: async ({
        stats,
        monster,
        currentPlayerHp,
        currentMonsterHp,
        messages,
    }) => {
        const crippleDamage = Math.floor(0.1 * monster.startingHp);
        currentMonsterHp = Math.max(currentMonsterHp - crippleDamage, 0);

        messages.push(
            `\`❄️\` Cripple spell casted! Dealt \`${crippleDamage}\` damage to the ${monster.name}`,
        );
        debug(
            `[${stats.userId}] Cripple spell: Dealt ${crippleDamage} damage to ${monster.name}`,
        );

        return { currentPlayerHp, currentMonsterHp };
    },

    Flare: async ({
        stats,
        monster,
        currentPlayerHp,
        currentMonsterHp,
        messages,
    }) => {
        const flareDamage = currentPlayerHp / 2;
        currentMonsterHp = Math.max(currentMonsterHp - flareDamage, 0);

        messages.push(
            `\`🎇\` Flare spell casted! Dealt \`${flareDamage}\` damage to the ${monster.name}`,
        );
        debug(
            `[${stats.userId}] Flare spell: Dealt ${flareDamage} damage to ${monster.name}`,
        );

        return { currentPlayerHp, currentMonsterHp };
    },

    Stun: async ({
        stats,
        monster,
        monsterState,
        currentPlayerHp,
        currentMonsterHp,
        messages,
    }) => {
        monsterState.stunned = true;

        messages.push(
            "`💫` Stun spell casted! The enemy is stunned and will miss its next attack",
        );
        debug(`[${stats.userId}] Stun spell: ${monster.name} is stunned`);

        return {
            currentPlayerHp,
            currentMonsterHp,
            monsterState,
        };
    },

    Poison: async ({
        stats,
        monster,
        monsterState,
        currentPlayerHp,
        currentMonsterHp,
        messages,
    }) => {
        if (!monsterState.poisoned) {
            monsterState.poisoned = true;
            messages.push(
                `\`💚\` Poison spell casted! The ${monster.name} is poisoned and will lose __10%__ of its HP each turn`,
            );
            debug(
                `[${stats.userId}] Poison spell: ${monster.name} is now poisoned`,
            );
        } else {
            messages.push(
                `\`💚\` Poison spell casted again! The ${monster.name} is already poisoned`,
            );
            debug(
                `[${stats.userId}] Poison spell: ${monster.name} was already poisoned`,
            );
        }

        return {
            currentPlayerHp,
            currentMonsterHp,
            monsterState,
        };
    },
};
