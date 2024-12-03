import { limits } from "..";
import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Frost Operative",
    group: MonsterGroup.Fatui,
    minExp: 40,
    maxExp: 60,
    minWorldLevel: 20,
    image: "https://lh.elara.workers.dev/rpg/monsters/frost_operative.png",
    drops: [
        {
            item: "Old Operative's Pocket Watch",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
        {
            item: "Operative's Standard Pocket Watch",
            minAmount: 1,
            maxAmount: 1,
            chance: 25,
        },
    ],
    critChance: 33,
    critValue: 2,
    defChance: 20,
    defValue: 100,
    baseHp: 17,
    baseAtk: 9,
    getStatsForWorldLevel(worldLevel: number) {
        if (!limits.check(worldLevel)) {
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
