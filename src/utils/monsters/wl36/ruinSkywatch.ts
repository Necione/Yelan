import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Ruin Drake: Skywatch",
    group: MonsterGroup.Machine,
    element: MonsterElement.Physical,
    minExp: 120,
    maxExp: 200,
    minadventurerank: 36,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_skywatch.png",
    drops: [
        {
            item: "Chaos Storage",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
        {
            item: "Chaos Module",
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
    critChance: 80,
    critValue: 1.5,
    defChance: 85,
    defValue: 1500,
    dodgeChance: 15,
    baseHp: 50,
    baseAtk: 45,
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
