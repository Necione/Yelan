import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Thunderhelm Lawachurl",
    group: MonsterGroup.Hilichurl,
    minExp: 10,
    maxExp: 25,
    minWorldLevel: 13,
    image: "https://lh.elara.workers.dev/rpg/monsters/thunderhelm_lawachurl.png",
    drops: [
        { item: "Stained Mask", minAmount: 1, maxAmount: 3, chance: 90 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Heavy Horn", minAmount: 1, maxAmount: 2, chance: 50 },
        { item: "Black Bronze Horn", minAmount: 1, maxAmount: 2, chance: 25 },
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
    defValue: 25,
    baseHp: 17,
    baseAtk: 8,
    getStatsForWorldLevel(worldLevel: number) {
        if (worldLevel < 1 || worldLevel > 30) {
            return null;
        }

        const hpScaleMultiplier = getHpScaleMultiplier(worldLevel);
        const newBaseHp = this.baseHp * hpScaleMultiplier;
        const minHp = Math.ceil(newBaseHp * 0.9);
        const maxHp = Math.ceil(newBaseHp * 1.1);

        const atkScaleMultiplier = getAtkScaleMultiplier(worldLevel);
        const newBaseAtk = Math.ceil(this.baseAtk * atkScaleMultiplier);
        const minDamage = Math.floor(newBaseAtk * 0.95);
        const maxDamage = Math.ceil(newBaseAtk * 1.05);

        return {
            worldLevel,
            minHp,
            maxHp,
            minDamage,
            maxDamage,
        };
    },
};
