import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Hilichurl",
    group: MonsterGroup.Hilichurl,
    minExp: 3,
    maxExp: 6,
    minWorldLevel: 1,
    image: "https://lh.elara.workers.dev/rpg/monsters/hilichurl.png",
    drops: [
        { item: "Damaged Mask", minAmount: 1, maxAmount: 2, chance: 42.02 },
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 11.2 },
        { item: "Onimous Mask", minAmount: 1, maxAmount: 2, chance: 2.8 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 3.14,
        },
    ],
    levelScaling: [
        { worldLevel: 1, hp: 73, atk: 46 },
        { worldLevel: 2, hp: 93, atk: 53 },
        { worldLevel: 3, hp: 114, atk: 60 },
        { worldLevel: 4, hp: 138, atk: 68 },
        { worldLevel: 5, hp: 164, atk: 76 },
        { worldLevel: 6, hp: 192, atk: 85 },
        { worldLevel: 7, hp: 222, atk: 95 },
        { worldLevel: 8, hp: 238, atk: 104 },
        { worldLevel: 9, hp: 262, atk: 113 },
        { worldLevel: 10, hp: 287, atk: 122 },
        { worldLevel: 11, hp: 327, atk: 135 },
        { worldLevel: 12, hp: 369, atk: 148 },
        { worldLevel: 13, hp: 412, atk: 162 },
        { worldLevel: 14, hp: 461, atk: 177 },
        { worldLevel: 15, hp: 511, atk: 193 },
        { worldLevel: 16, hp: 562, atk: 209 },
        { worldLevel: 17, hp: 625, atk: 232 },
        { worldLevel: 18, hp: 680, atk: 255 },
        { worldLevel: 19, hp: 736, atk: 278 },
        { worldLevel: 20, hp: 885, atk: 301 },
        { worldLevel: 21, hp: 932, atk: 323 },
        { worldLevel: 22, hp: 979, atk: 345 },
        { worldLevel: 23, hp: 1024, atk: 366 },
        { worldLevel: 24, hp: 1084, atk: 389 },
        { worldLevel: 25, hp: 1145, atk: 411 },
        { worldLevel: 26, hp: 1208, atk: 427 },
        { worldLevel: 27, hp: 1272, atk: 443 },
        { worldLevel: 28, hp: 1338, atk: 459 },
        { worldLevel: 29, hp: 1405, atk: 475 },
        { worldLevel: 30, hp: 1473, atk: 492 },
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
