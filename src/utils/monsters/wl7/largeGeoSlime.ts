import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Large Geo Slime",
    group: MonsterGroup.Slime,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 7,
    image: "https://lh.elara.workers.dev/rpg/monsters/large_geo_slime.png",
    drops: [
        {
            item: "Slime Secretions",
            minAmount: 1,
            maxAmount: 3,
            chance: 90,
        },
        {
            item: "Slime Concentrate",
            minAmount: 1,
            maxAmount: 2,
            chance: 75,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 10,
    critValue: 1.5,
    defchance: 90,
    defValue: 50,
    baseHp: 15,
    baseAtk: 4,
    getStatsForWorldLevel(worldLevel: number) {
        if (worldLevel < 1 || worldLevel > 30) {
            return null;
        }

        const hpScaleMultiplier = getHpScaleMultiplier(worldLevel);
        const newBaseHp = this.baseHp * hpScaleMultiplier;
        const minHp = Math.ceil(newBaseHp * 0.9);
        const maxHp = Math.ceil(newBaseHp * 1.1);

        const atkScaleMultiplier = getAtkScaleMultiplier(worldLevel);
        const newBaseAtk = Math.ceil(this.baseAtk * atkScaleMultiplier);
        const minDamage = Math.floor(newBaseAtk * 0.95);
        const maxDamage = Math.ceil(newBaseAtk * 1.05);

        return {
            worldLevel,
            minHp,
            maxHp,
            minDamage,
            maxDamage,
        };
    },
};
