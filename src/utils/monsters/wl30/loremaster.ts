import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Eremite: Loremaster",
    group: MonsterGroup.Eremite,
    element: MonsterElement.Pyro,
    minExp: 75,
    maxExp: 100,
    minadventurerank: 30,
    image: "https://lh.elara.workers.dev/rpg/monsters/loremaster.png",
    drops: [
        {
            item: "Faded Red Satin",
            minAmount: 1,
            maxAmount: 1,
            chance: 100,
        },
        {
            item: "Trimmed Red Silk",
            minAmount: 1,
            maxAmount: 1,
            chance: 75,
        },
        {
            item: "Rich Red Brocade",
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

    critChance: 25,
    critValue: 1.25,
    defChance: 50,
    defValue: 300,
    baseHp: 25,
    baseAtk: 19,
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
