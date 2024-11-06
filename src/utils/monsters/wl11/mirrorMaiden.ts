import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Mirror Maiden",
    group: MonsterGroup.Fatui,
    minExp: 10,
    maxExp: 15,
    minWorldLevel: 11,
    image: "https://lh.elara.workers.dev/rpg/monsters/mirror_maiden.png",
    drops: [
        { item: "Dismal Prism", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Crystal Prism", minAmount: 1, maxAmount: 2, chance: 25 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 30,
    critValue: 1.2,
    defChance: 25,
    defValue: 30,
    baseHp: 18,
    baseAtk: 5,
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
