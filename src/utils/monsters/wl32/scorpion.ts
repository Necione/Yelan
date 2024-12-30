import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Scorpion",
    group: MonsterGroup.Beast,
    element: MonsterElement.Electro,
    minExp: 75,
    maxExp: 100,
    minadventurerank: 32,
    image: "https://lh.elara.workers.dev/rpg/monsters/scorpion.png",
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

    critChance: 30,
    critValue: 2.2,
    defChance: 80,
    defValue: 750,
    baseHp: 30,
    baseAtk: 27,
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
