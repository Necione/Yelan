import { limits } from "..";
import { MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "The Physic",
    group: MonsterGroup.Boss,
    minExp: 0,
    maxExp: 0,
    minadventurerank: 1,
    image: "https://lh.elara.workers.dev/rpg/april/thephysic.png",
    drops: [
        {
            item: "Chips",
            minAmount: 1,
            maxAmount: 5,
            chance: 100,
        },
    ],

    critChance: 25,
    critValue: 1.5,
    defChance: 75,
    defValue: 50,
    baseHp: 150,
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
