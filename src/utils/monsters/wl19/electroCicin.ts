import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Electro Cicin",
    group: MonsterGroup.Abyss,
    minExp: 20,
    maxExp: 35,
    minWorldLevel: 19,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_cicin.png",
    drops: [
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 20,
    critValue: 1.5,
    defChance: 50,
    defValue: 25,
    baseHp: 18,
    baseAtk: 7,
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
