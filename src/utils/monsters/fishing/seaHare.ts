import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Angelic Sea Hare",
    group: MonsterGroup.Fishing,
    element: MonsterElement.Hydro,
    minExp: 0,
    maxExp: 0,
    minFishingLevel: 3,
    image: "https://lh.elara.workers.dev/rpg/fishing/sea_hare.png",
    drops: [
        {
            item: "Trans­ocean­ic Pearl",
            minAmount: 1,
            maxAmount: 2,
            chance: 90,
        },
    ],
    baseHp: 6,
    baseAtk: 3,
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
