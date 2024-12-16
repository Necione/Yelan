import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Floating Hydro Fungus",
    group: MonsterGroup.Fishing,
    element: MonsterElement.Hydro,
    minExp: 0,
    maxExp: 0,
    minFishingLevel: 1,
    image: "https://lh.elara.workers.dev/rpg/monsters/hydro_fungus.png",
    drops: [
        {
            item: "Slime Condensate",
            minAmount: 1,
            maxAmount: 2,
            chance: 90,
        },
    ],
    baseHp: 15,
    baseAtk: 10,
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
