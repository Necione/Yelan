import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Mitachurl",
    group: MonsterGroup.Hilichurl,
    element: MonsterElement.Physical,
    minExp: 5,
    maxExp: 7,
    minadventurerank: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/mitachurl.png",
    drops: [
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 90 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 1, chance: 50 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 15,
    critValue: 2,
    defChance: 15,
    defValue: 20,
    baseHp: 20,
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
