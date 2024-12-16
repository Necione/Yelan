import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Fathomless Flames",
    group: MonsterGroup.Abyss,
    element: MonsterElement.Pyro,
    minExp: 20,
    maxExp: 30,
    minadventurerank: 16,
    image: "https://lh.elara.workers.dev/rpg/monsters/fathomless_flame.png",
    drops: [
        {
            item: "Dead Ley Line Branch",
            minAmount: 1,
            maxAmount: 2,
            chance: 75,
        },
        {
            item: "Dead Ley Line Leaves",
            minAmount: 1,
            maxAmount: 2,
            chance: 25,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 50,
    critValue: 1.5,
    defChance: 50,
    defValue: 50,
    baseHp: 18,
    baseAtk: 8,
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
