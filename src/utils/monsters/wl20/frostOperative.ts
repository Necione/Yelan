import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Frost Operative",
    group: MonsterGroup.Fatui,
    element: MonsterElement.Cryo,
    minExp: 40,
    maxExp: 60,
    minadventurerank: 20,
    souls: 7,
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
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    critChance: 33,
    critValue: 1.5,
    defChance: 20,
    defValue: 100,
    baseHp: 17,
    baseAtk: 12,
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
