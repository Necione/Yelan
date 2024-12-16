import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Ruin Scout",
    group: MonsterGroup.Machine,
    element: MonsterElement.Physical,
    minExp: 5,
    maxExp: 10,
    minadventurerank: 9,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_scout.png",
    drops: [
        {
            item: "Chaos Gear",
            minAmount: 1,
            maxAmount: 1,
            chance: 75,
        },
    ],
    critChance: 10,
    critValue: 2,
    defChance: 25,
    defValue: 50,
    baseHp: 14,
    baseAtk: 6,
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
