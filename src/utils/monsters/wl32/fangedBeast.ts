import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Fanged Beast",
    group: MonsterGroup.Beast,
    element: MonsterElement.Dendro,
    minExp: 75,
    maxExp: 100,
    minadventurerank: 32,
    image: "https://lh.elara.workers.dev/rpg/monsters/fanged_beast.png",
    drops: [
        {
            item: "Desiccated Shell",
            minAmount: 1,
            maxAmount: 1,
            chance: 75,
        },
        {
            item: "Sturdy Shell",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 50,
    critValue: 3,
    defChance: 75,
    defValue: 500,
    baseHp: 35,
    baseAtk: 20,
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
