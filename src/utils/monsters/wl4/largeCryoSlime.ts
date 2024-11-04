import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Large Cryo Slime",
    group: MonsterGroup.Slime,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 4,
    image: "https://lh.elara.workers.dev/rpg/monsters/large_cryo_slime.png",
    drops: [
        {
            item: "Slime Condensate",
            minAmount: 1,
            maxAmount: 2,
            chance: 67.23,
        },
        {
            item: "Slime Secretions",
            minAmount: 1,
            maxAmount: 2,
            chance: 17.92,
        },
        {
            item: "Slime Concentrate",
            minAmount: 1,
            maxAmount: 2,
            chance: 4.48,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 3.14,
        },
    ],

    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 0.2,
    levelScaling: [
        { worldLevel: 4, hp: 49, atk: 6 },
        { worldLevel: 5, hp: 65, atk: 7 },
        { worldLevel: 6, hp: 87, atk: 8 },
        { worldLevel: 7, hp: 120, atk: 10 },
        { worldLevel: 8, hp: 148, atk: 12 },
        { worldLevel: 9, hp: 175, atk: 14 },
        { worldLevel: 10, hp: 203, atk: 15 },
        { worldLevel: 11, hp: 230, atk: 17 },
        { worldLevel: 12, hp: 285, atk: 20 },
        { worldLevel: 13, hp: 340, atk: 23 },
        { worldLevel: 14, hp: 395, atk: 25 },
        { worldLevel: 15, hp: 450, atk: 27 },
        { worldLevel: 16, hp: 560, atk: 40 },
        { worldLevel: 17, hp: 615, atk: 50 },
        { worldLevel: 18, hp: 670, atk: 60 },
        { worldLevel: 19, hp: 725, atk: 75 },
        { worldLevel: 20, hp: 890, atk: 80 },
        { worldLevel: 21, hp: 900, atk: 85 },
        { worldLevel: 22, hp: 950, atk: 90 },
        { worldLevel: 23, hp: 1000, atk: 95 },
        { worldLevel: 24, hp: 1050, atk: 100 },
        { worldLevel: 25, hp: 1100, atk: 105 },
        { worldLevel: 26, hp: 1150, atk: 110 },
        { worldLevel: 27, hp: 1200, atk: 115 },
        { worldLevel: 28, hp: 1250, atk: 120 },
        { worldLevel: 29, hp: 1300, atk: 125 },
        { worldLevel: 30, hp: 1350, atk: 130 },
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
