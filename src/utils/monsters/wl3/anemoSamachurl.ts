import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Anemo Samachurl",
    group: MonsterGroup.Hilichurl,
    minExp: 5,
    maxExp: 7,
    minWorldLevel: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/anemo_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 3, chance: 85 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 2, chance: 35 },
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
        { worldLevel: 1, hp: 73, atk: 102 },
        { worldLevel: 2, hp: 93, atk: 117 },
        { worldLevel: 3, hp: 114, atk: 133 },
        { worldLevel: 4, hp: 138, atk: 151 },
        { worldLevel: 5, hp: 164, atk: 170 },
        { worldLevel: 6, hp: 192, atk: 190 },
        { worldLevel: 7, hp: 222, atk: 211 },
        { worldLevel: 8, hp: 238, atk: 230 },
        { worldLevel: 9, hp: 262, atk: 250 },
        { worldLevel: 10, hp: 287, atk: 271 },
        { worldLevel: 11, hp: 327, atk: 299 },
        { worldLevel: 12, hp: 369, atk: 329 },
        { worldLevel: 13, hp: 412, atk: 360 },
        { worldLevel: 14, hp: 461, atk: 393 },
        { worldLevel: 15, hp: 511, atk: 428 },
        { worldLevel: 16, hp: 562, atk: 465 },
        { worldLevel: 17, hp: 625, atk: 515 },
        { worldLevel: 18, hp: 680, atk: 566 },
        { worldLevel: 19, hp: 736, atk: 619 },
        { worldLevel: 20, hp: 885, atk: 669 },
        { worldLevel: 21, hp: 932, atk: 717 },
        { worldLevel: 22, hp: 979, atk: 766 },
        { worldLevel: 23, hp: 1024, atk: 814 },
        { worldLevel: 24, hp: 1084, atk: 864 },
        { worldLevel: 25, hp: 1145, atk: 914 },
        { worldLevel: 26, hp: 1208, atk: 949 },
        { worldLevel: 27, hp: 1272, atk: 984 },
        { worldLevel: 28, hp: 1338, atk: 1020 },
        { worldLevel: 29, hp: 1405, atk: 1056 },
        { worldLevel: 30, hp: 1473, atk: 1093 },
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
