import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Electro Abyss Mage",
    group: MonsterGroup.Abyss,
    element: MonsterElement.Electro,
    minExp: 120,
    maxExp: 200,
    minadventurerank: 36,
    souls: 5,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_abyss_mage.png",
    drops: [
        {
            item: "Dead Ley Line Leaves",
            minAmount: 1,
            maxAmount: 2,
            chance: 100,
        },
        {
            item: "Ley Line Sprout",
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
    critValue: 2.75,
    defChance: 40,
    defValue: 500,
    dodgeChance: 20,
    baseHp: 30,
    baseAtk: 25,
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
