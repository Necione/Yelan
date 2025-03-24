import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Electro Specter",
    group: MonsterGroup.Specter,
    element: MonsterElement.Electro,
    minExp: 45,
    maxExp: 50,
    minadventurerank: 26,
    souls: 7,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_specter.png",
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
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 20,
    critValue: 1.2,
    defChance: 75,
    defValue: 400,
    baseHp: 19,
    baseAtk: 13,
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
