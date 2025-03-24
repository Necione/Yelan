import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Pyro Hilichurl Berserker",
    group: MonsterGroup.Hilichurl,
    element: MonsterElement.Pyro,
    minExp: 4,
    maxExp: 8,
    minadventurerank: 2,
    souls: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/pyro_hilichurl_berserker.png",
    drops: [
        { item: "Damaged Mask", minAmount: 1, maxAmount: 2, chance: 90 },
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 1, chance: 25 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 20,
    baseHp: 12,
    baseAtk: 4,
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
