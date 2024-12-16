import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Wind Operative",
    group: MonsterGroup.Fatui,
    element: MonsterElement.Anemo,
    minExp: 40,
    maxExp: 60,
    minadventurerank: 20,
    image: "https://lh.elara.workers.dev/rpg/monsters/wind_operative.png",
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
    critChance: 50,
    critValue: 1.2,
    defChance: 20,
    defValue: 100,
    baseHp: 17,
    baseAtk: 9,
    getStatsForadventureRank(adventureRank: number) {
        if (!limits.check(adventureRank)) {
            return null;
        }

        const hpScaleMultiplier = getHpScaleMultiplier(adventureRank);
        const newBaseHp = this.baseHp * hpScaleMultiplier;
        const minHp = Math.ceil(newBaseHp * 0.9);
        const maxHp = Math.ceil(newBaseHp * 1.1);

        const atkScaleMultiplier = getAtkScaleMultiplier(adventureRank);
        const newBaseAtk = Math.ceil(this.baseAtk * atkScaleMultiplier);
        const minDamage = Math.floor(newBaseAtk * 0.95);
        const maxDamage = Math.ceil(newBaseAtk * 1.05);

        return {
            adventureRank,
            minHp,
            maxHp,
            minDamage,
            maxDamage,
        };
    },
};
