import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Frostarm Lawachurl",
    group: MonsterGroup.Hilichurl,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 6,
    critChance: 25,
    critValue: 1.5,
    defChance: 20,
    defValue: 0.2,
    image: "https://lh.elara.workers.dev/rpg/monsters/frostarm_lawachurl.png",
    drops: [
        { item: "Stained Mask", minAmount: 1, maxAmount: 3, chance: 90 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Heavy Horn", minAmount: 1, maxAmount: 2, chance: 50 },
        { item: "Black Bronze Horn", minAmount: 1, maxAmount: 2, chance: 25 },
        { item: "Life Essence", minAmount: 1, maxAmount: 1, chance: 10 },
    ],
    levelScaling: [
        { worldLevel: 6, hp: 125, atk: 24 },
        { worldLevel: 7, hp: 170, atk: 30 },
        { worldLevel: 8, hp: 208, atk: 36 },
        { worldLevel: 9, hp: 268, atk: 42 },
        { worldLevel: 10, hp: 310, atk: 46 },
        { worldLevel: 11, hp: 340, atk: 50 },
        { worldLevel: 12, hp: 385, atk: 56 },
        { worldLevel: 13, hp: 435, atk: 62 },
        { worldLevel: 14, hp: 490, atk: 66 },
        { worldLevel: 15, hp: 545, atk: 72 },
        { worldLevel: 16, hp: 600, atk: 84 },
        { worldLevel: 17, hp: 665, atk: 108 },
        { worldLevel: 18, hp: 730, atk: 130 },
        { worldLevel: 19, hp: 795, atk: 160 },
        { worldLevel: 20, hp: 900, atk: 180 },
        { worldLevel: 21, hp: 950, atk: 190 },
        { worldLevel: 22, hp: 1000, atk: 200 },
        { worldLevel: 23, hp: 1050, atk: 210 },
        { worldLevel: 24, hp: 1100, atk: 220 },
        { worldLevel: 25, hp: 1150, atk: 230 },
        { worldLevel: 26, hp: 1200, atk: 240 },
        { worldLevel: 27, hp: 1250, atk: 250 },
        { worldLevel: 28, hp: 1300, atk: 260 },
        { worldLevel: 29, hp: 1350, atk: 270 },
        { worldLevel: 30, hp: 1400, atk: 280 },
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
