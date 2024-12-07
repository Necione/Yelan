import type { UserCharacter } from "@prisma/client";

export function getExplorationStatus(character: UserCharacter): string {
    if (character.expedition) {
        if (character.expeditionStart) {
            const expeditionDuration = 60 * 60 * 1000;
            const now = Date.now();
            const start = character.expeditionStart.getTime();
            const end = start + expeditionDuration;
            if (now < end) {
                const remaining = end - now;
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                return `On expedition (${minutes}m ${seconds}s remaining)`;
            }
        }
        return "On expedition";
    }
    return "Idle";
}
