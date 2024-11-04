import { MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Cryo Hilichurl Shooter",
    group: MonsterGroup.Hilichurl,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 6,
    critChance: 25,
    critValue: 1.5,
    defChance: 20,
    defValue: 0.2,
    image: "https://lh.elara.workers.dev/rpg/monsters/cryo_hilichurl_shooter.png",
    drops: [
        {
            item: "Firm Arrowhead",
            minAmount: 1,
            maxAmount: 3,
            chance: 90,
        },
        {
            item: "Sharp Arrowhead",
            minAmount: 1,
            maxAmount: 2,
            chance: 75,
        },
        {
            item: "Weathered Arrowhead",
            minAmount: 1,
            maxAmount: 2,
            chance: 50,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    levelScaling: [
        { worldLevel: 6, hp: 105, atk: 24 },
        { worldLevel: 7, hp: 150, atk: 30 },
        { worldLevel: 8, hp: 188, atk: 36 },
        { worldLevel: 9, hp: 248, atk: 42 },
        { worldLevel: 10, hp: 290, atk: 46 },
        { worldLevel: 11, hp: 320, atk: 50 },
        { worldLevel: 12, hp: 365, atk: 56 },
        { worldLevel: 13, hp: 415, atk: 62 },
        { worldLevel: 14, hp: 470, atk: 66 },
        { worldLevel: 15, hp: 525, atk: 72 },
        { worldLevel: 16, hp: 580, atk: 84 },
        { worldLevel: 17, hp: 645, atk: 108 },
        { worldLevel: 18, hp: 710, atk: 130 },
        { worldLevel: 19, hp: 775, atk: 160 },
        { worldLevel: 20, hp: 880, atk: 180 },
        { worldLevel: 21, hp: 900, atk: 190 },
        { worldLevel: 22, hp: 950, atk: 200 },
        { worldLevel: 23, hp: 1000, atk: 210 },
        { worldLevel: 24, hp: 1050, atk: 220 },
        { worldLevel: 25, hp: 1100, atk: 230 },
        { worldLevel: 26, hp: 1150, atk: 240 },
        { worldLevel: 27, hp: 1200, atk: 250 },
        { worldLevel: 28, hp: 1250, atk: 260 },
        { worldLevel: 29, hp: 1300, atk: 270 },
        { worldLevel: 30, hp: 1350, atk: 280 },
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
