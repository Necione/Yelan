import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Electro Hilichurl Shooter",
    group: MonsterGroup.Hilichurl,
    minHp: 20,
    maxHp: 25,
    minDamage: 4,
    maxDamage: 7,
    minExp: 4,
    maxExp: 8,
    minWorldLevel: 2,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_hilichurl_shooter.png",
    drops: [
        {
            item: "Firm Arrowhead",
            minAmount: 1,
            maxAmount: 2,
            chance: 84.84,
        },
        {
            item: "Sharp Arrowhead",
            minAmount: 1,
            maxAmount: 2,
            chance: 22.41,
        },
        {
            item: "Weathered Arrowhead",
            minAmount: 1,
            maxAmount: 2,
            chance: 5.6,
        },
        { item: "Damaged Mask", minAmount: 1, maxAmount: 2, chance: 16.81 },
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 4.48 },
        { item: "Onimous Mask", minAmount: 1, maxAmount: 2, chance: 1.12 },
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
        { worldLevel: 1, hp: 58, atk: 34 },
        { worldLevel: 2, hp: 74, atk: 39 },
        { worldLevel: 3, hp: 92, atk: 45 },
        { worldLevel: 4, hp: 111, atk: 51 },
        { worldLevel: 5, hp: 131, atk: 57 },
        { worldLevel: 6, hp: 154, atk: 64 },
        { worldLevel: 7, hp: 178, atk: 71 },
        { worldLevel: 8, hp: 190, atk: 78 },
        { worldLevel: 9, hp: 209, atk: 84 },
        { worldLevel: 10, hp: 229, atk: 92 },
        { worldLevel: 11, hp: 262, atk: 101 },
        { worldLevel: 12, hp: 295, atk: 111 },
        { worldLevel: 13, hp: 330, atk: 121 },
        { worldLevel: 14, hp: 368, atk: 133 },
        { worldLevel: 15, hp: 408, atk: 145 },
        { worldLevel: 16, hp: 450, atk: 157 },
        { worldLevel: 17, hp: 500, atk: 174 },
        { worldLevel: 18, hp: 544, atk: 191 },
        { worldLevel: 19, hp: 589, atk: 209 },
        { worldLevel: 20, hp: 708, atk: 226 },
        { worldLevel: 21, hp: 746, atk: 242 },
        { worldLevel: 22, hp: 784, atk: 258 },
        { worldLevel: 23, hp: 819, atk: 275 },
        { worldLevel: 24, hp: 867, atk: 291 },
        { worldLevel: 25, hp: 916, atk: 309 },
        { worldLevel: 26, hp: 966, atk: 320 },
        { worldLevel: 27, hp: 1018, atk: 332 },
        { worldLevel: 28, hp: 1070, atk: 344 },
        { worldLevel: 29, hp: 1124, atk: 356 },
        { worldLevel: 30, hp: 1178, atk: 369 },
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
