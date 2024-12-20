import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Geo Specter",
    group: MonsterGroup.Specter,
    element: MonsterElement.Geo,
    minExp: 75,
    maxExp: 100,
    minadventurerank: 30,
    image: "https://lh.elara.workers.dev/rpg/monsters/geo_specter.png",
    drops: [
        {
            item: "Spectral Husk",
            minAmount: 1,
            maxAmount: 1,
            chance: 75,
        },
        {
            item: "Spectral Heart",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 20,
    critValue: 1.2,
    defChance: 75,
    defValue: 500,
    baseHp: 19,
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
