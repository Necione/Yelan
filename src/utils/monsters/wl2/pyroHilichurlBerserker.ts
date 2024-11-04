import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Pyro Hilichurl Berserker",
    group: MonsterGroup.Hilichurl,
    minExp: 4,
    maxExp: 8,
    minWorldLevel: 2,
    image: "https://lh.elara.workers.dev/rpg/monsters/pyro_hilichurl_berserker.png",
    drops: [
        { item: "Damaged Mask", minAmount: 1, maxAmount: 2, chance: 90 },
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 1, chance: 25 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 0.2,
    levelScaling: [
        { worldLevel: 2, hp: 25, atk: 4 },
        { worldLevel: 3, hp: 38, atk: 6 },
        { worldLevel: 4, hp: 53, atk: 9 },
        { worldLevel: 5, hp: 82, atk: 11 },
        { worldLevel: 6, hp: 105, atk: 12 },
        { worldLevel: 7, hp: 150, atk: 15 },
        { worldLevel: 8, hp: 188, atk: 18 },
        { worldLevel: 9, hp: 248, atk: 21 },
        { worldLevel: 10, hp: 290, atk: 23 },
        { worldLevel: 11, hp: 320, atk: 25 },
        { worldLevel: 12, hp: 365, atk: 28 },
        { worldLevel: 13, hp: 415, atk: 31 },
        { worldLevel: 14, hp: 470, atk: 33 },
        { worldLevel: 15, hp: 525, atk: 36 },
        { worldLevel: 16, hp: 580, atk: 42 },
        { worldLevel: 17, hp: 645, atk: 54 },
        { worldLevel: 18, hp: 710, atk: 65 },
        { worldLevel: 19, hp: 775, atk: 80 },
        { worldLevel: 20, hp: 880, atk: 90 },
        { worldLevel: 21, hp: 950, atk: 95 },
        { worldLevel: 22, hp: 1020, atk: 100 },
        { worldLevel: 23, hp: 1100, atk: 105 },
        { worldLevel: 24, hp: 1180, atk: 110 },
        { worldLevel: 25, hp: 1260, atk: 115 },
        { worldLevel: 26, hp: 1340, atk: 120 },
        { worldLevel: 27, hp: 1420, atk: 125 },
        { worldLevel: 28, hp: 1500, atk: 130 },
        { worldLevel: 29, hp: 1580, atk: 135 },
        { worldLevel: 30, hp: 1660, atk: 140 },
    ],
    getStatsForWorldLevel(worldLevel: number) {
        const stats = this.levelScaling.find(
            (stat) => stat.worldLevel === worldLevel,
        );

        if (stats) {
            return {
                worldLevel: stats.worldLevel,
                minHp: stats.hp,
                maxHp: stats.hp,
                minDamage: stats.atk,
                maxDamage: stats.atk,
            };
        } else {
            return null;
        }
    },
};
