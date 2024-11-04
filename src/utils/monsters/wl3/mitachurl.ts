import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Mitachurl",
    group: MonsterGroup.Hilichurl,
    minExp: 5,
    maxExp: 7,
    minWorldLevel: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/mitachurl.png",
    drops: [
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 90 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 1, chance: 50 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 15,
    critValue: 2,
    defChance: 15,
    defValue: 0.2,
    levelScaling: [
        { worldLevel: 3, hp: 58, atk: 6 },
        { worldLevel: 4, hp: 73, atk: 9 },
        { worldLevel: 5, hp: 102, atk: 11 },
        { worldLevel: 6, hp: 125, atk: 12 },
        { worldLevel: 7, hp: 170, atk: 15 },
        { worldLevel: 8, hp: 208, atk: 18 },
        { worldLevel: 9, hp: 268, atk: 21 },
        { worldLevel: 10, hp: 310, atk: 23 },
        { worldLevel: 11, hp: 340, atk: 25 },
        { worldLevel: 12, hp: 385, atk: 28 },
        { worldLevel: 13, hp: 435, atk: 31 },
        { worldLevel: 14, hp: 490, atk: 33 },
        { worldLevel: 15, hp: 545, atk: 36 },
        { worldLevel: 16, hp: 600, atk: 42 },
        { worldLevel: 17, hp: 665, atk: 54 },
        { worldLevel: 18, hp: 730, atk: 65 },
        { worldLevel: 19, hp: 795, atk: 80 },
        { worldLevel: 20, hp: 900, atk: 90 },
        { worldLevel: 21, hp: 950, atk: 95 },
        { worldLevel: 22, hp: 1000, atk: 100 },
        { worldLevel: 23, hp: 1050, atk: 105 },
        { worldLevel: 24, hp: 1100, atk: 110 },
        { worldLevel: 25, hp: 1150, atk: 115 },
        { worldLevel: 26, hp: 1200, atk: 120 },
        { worldLevel: 27, hp: 1250, atk: 125 },
        { worldLevel: 28, hp: 1300, atk: 130 },
        { worldLevel: 29, hp: 1350, atk: 135 },
        { worldLevel: 30, hp: 1400, atk: 140 },
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
