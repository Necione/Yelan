import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Eremite: Axe Vanguard",
    group: MonsterGroup.Eremite,
    element: MonsterElement.Physical,
    minExp: 40,
    maxExp: 60,
    minadventurerank: 21,
    image: "https://lh.elara.workers.dev/rpg/monsters/axe_vanguard.png",
    drops: [
        {
            item: "Rich Red Brocade",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    critChance: 50,
    critValue: 1.2,
    defChance: 50,
    defValue: 200,
    baseHp: 17,
    baseAtk: 12,
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
