import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Cryo Specter",
    group: MonsterGroup.Specter,
    element: MonsterElement.Cryo,
    minExp: 45,
    maxExp: 50,
    minadventurerank: 26,
    image: "https://lh.elara.workers.dev/rpg/monsters/cryo_specter.png",
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
    defValue: 250,
    baseHp: 20,
    baseAtk: 9,
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
