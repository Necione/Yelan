import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Electro Slime",
    group: MonsterGroup.Slime,
    minExp: 3,
    maxExp: 6,
    minWorldLevel: 1,
    critChance: 10,
    critValue: 1.5,
    defChance: 5,
    defValue: 0.25,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_slime.png",
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
    levelScaling: [
        { worldLevel: 1, hp: 58, atk: 15 },
        { worldLevel: 2, hp: 74, atk: 18 },
        { worldLevel: 3, hp: 92, atk: 20 },
        { worldLevel: 4, hp: 111, atk: 23 },
        { worldLevel: 5, hp: 131, atk: 25 },
        { worldLevel: 6, hp: 154, atk: 28 },
        { worldLevel: 7, hp: 178, atk: 32 },
        { worldLevel: 8, hp: 190, atk: 35 },
        { worldLevel: 9, hp: 209, atk: 38 },
        { worldLevel: 10, hp: 229, atk: 41 },
        { worldLevel: 11, hp: 262, atk: 45 },
        { worldLevel: 12, hp: 295, atk: 49 },
        { worldLevel: 13, hp: 330, atk: 54 },
        { worldLevel: 14, hp: 368, atk: 59 },
        { worldLevel: 15, hp: 408, atk: 64 },
        { worldLevel: 16, hp: 450, atk: 70 },
        { worldLevel: 17, hp: 500, atk: 77 },
        { worldLevel: 18, hp: 544, atk: 85 },
        { worldLevel: 19, hp: 589, atk: 93 },
        { worldLevel: 20, hp: 708, atk: 100 },
        { worldLevel: 21, hp: 746, atk: 108 },
        { worldLevel: 22, hp: 784, atk: 115 },
        { worldLevel: 23, hp: 819, atk: 122 },
        { worldLevel: 24, hp: 867, atk: 130 },
        { worldLevel: 25, hp: 916, atk: 137 },
        { worldLevel: 26, hp: 966, atk: 142 },
        { worldLevel: 27, hp: 1018, atk: 148 },
        { worldLevel: 28, hp: 1070, atk: 153 },
        { worldLevel: 29, hp: 1124, atk: 158 },
        { worldLevel: 30, hp: 1178, atk: 164 },
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
