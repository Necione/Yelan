import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Pyro Hilichurl Berserker",
    group: MonsterGroup.Hilichurl,
    minExp: 4,
    maxExp: 8,
    minWorldLevel: 2,
    image: "https://lh.elara.workers.dev/rpg/monsters/pyro_hilichurl_berserker.png",
    drops: [
        { item: "Damaged Mask", minAmount: 1, maxAmount: 2, chance: 90 },
        { item: "Stained Mask", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 1, chance: 25 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 20,
    baseHp: 12,
    baseAtk: 4,
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
