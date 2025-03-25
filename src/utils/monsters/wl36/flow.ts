import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Flow-Inverted Manifestation",
    group: MonsterGroup.Beast,
    element: MonsterElement.Hydro,
    minExp: 120,
    maxExp: 200,
    minadventurerank: 36,
    souls: 8,
    image: "https://lh.elara.workers.dev/rpg/monsters/flow_inverted_manifestation.png",
    drops: [
        {
            item: "Shard of a Shattered Will",
            minAmount: 1,
            maxAmount: 1,
            chance: 75,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 25,
    critValue: 2.25,
    defChance: 75,
    defValue: 750,
    dodgeChance: 10,
    baseHp: 35,
    baseAtk: 30,
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
