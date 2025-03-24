import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Mirror Maiden",
    group: MonsterGroup.Fatui,
    element: MonsterElement.Hydro,
    minExp: 10,
    maxExp: 15,
    minadventurerank: 11,
    souls: 6,
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
